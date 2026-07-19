/**
 * Enhanced Authentication Module with JWT Support
 * Provides secure authentication, user management, and session handling
 */

import { generateJWT, storeToken, getStoredToken, getCurrentTokenPayload, clearTokens, AuthToken, verifyJWT } from './jwt'
import { apiFetch } from '@/lib/api'
import { validateEmail, validatePassword } from './validation'
import { AuthenticationError, ConflictError, NotFoundError, ErrorLogger } from './errors'

// Authentication utilities and types
export type UserRole = 'customer' | 'vendor' | 'admin'

export interface AvailabilitySlot {
  date: string // ISO date format
  timeSlots: {
    startTime: string // HH:MM format
    endTime: string
  }[]
}

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  password?: string // Hashed password (client-side storage only)
  phone?: string
  businessName?: string
  category?: string
  location?: string
  approved?: boolean
  createdAt: string
  // Profile fields for vendors
  description?: string
  photos?: string[] // Base64 or URLs
  videos?: string[] // Cloudinary video URLs
  services?: string[]
  pricing?: string
  priceMin?: number
  priceMax?: number
  experience?: string
  rejectionReason?: string
  rejectedAt?: string
  approvedAt?: string
  availability?: AvailabilitySlot[]
  blockedDates?: string[] // Dates vendor is NOT available (YYYY-MM-DD)
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token?: string
}

/**
 * Simple client-side hash function (NOT cryptographically secure)
 * For production, use a proper hashing library like bcrypt.js
 * @param password - Password to hash
 * @returns Hashed password
 */
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return 'hash_' + Math.abs(hash).toString(16)
}

/**
 * Verify password against hash
 * @param password - Password to verify
 * @param hash - Hash to verify against
 * @returns True if password matches hash
 */
function verifyPasswordHash(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// LocalStorage keys
const AUTH_STORAGE_KEY = 'eventora_auth'
const USERS_STORAGE_KEY = 'eventora_users'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5125'

/**
 * Get all registered users from localStorage
 * @returns Array of registered users
 */
export function getStoredUsers(): User[] {
  throw new Error('Local demo users (getStoredUsers) are disabled. Use backend APIs via lib/data + lib/auth API helpers.')
}

/**
 * Save users to localStorage
 * @param users - Users array to save
 */
export function saveUsers(users: User[]): void {
  void users
  throw new Error('Local demo users (saveUsers) are disabled. Persist users in the backend instead.')
}

/**
 * Get current authenticated user from token
 * Uses JWT token validation for session security
 * @returns Current user or null if not authenticated
 */
/**
 * Returns the currently authenticated user from localStorage, validated against
 * the stored JWT. Returns null if the token is missing or expired.
 * The full user object (including vendor fields) lives in AUTH_STORAGE_KEY;
 * the JWT only carries userId / email / role.
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null

  const tokenPayload = getCurrentTokenPayload()
  if (!tokenPayload) return null

  const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
  if (storedAuth) {
    try {
      const authState = JSON.parse(storedAuth) as AuthState
      if (authState?.user?.id === tokenPayload.userId) {
        return authState.user
      }
    } catch {
      // corrupted storage — clear so the next login starts fresh
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  return null
}

/**
 * Save authentication state with JWT token
 * @param user - User to authenticate or null to logout
 */
export function setAuthState(user: User | null, tokenOverride?: AuthToken | string): void {
  if (typeof window === 'undefined') return

  if (user) {
    let token: AuthToken

    if (tokenOverride) {
      if (typeof tokenOverride === 'string') {
        const payload = verifyJWT(tokenOverride)
        token = {
          token: tokenOverride,
          payload: payload ?? { userId: user.id, email: user.email, role: user.role, iat: 0, exp: 0 },
          expiresAt: payload?.exp ?? 0,
        }
      } else {
        token = tokenOverride
      }
    } else {
      token = generateJWT(user.id, user.email, user.role)
    }

    storeToken(token)

    // Store auth state
    const authState: AuthState = {
      user: { ...user, password: undefined }, // Don't expose password
      isAuthenticated: true,
      token: token.token,
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
  } else {
    // Clear tokens and auth state
    clearTokens()
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

/**
 * Register a new user with enhanced security
 * @param userData - User registration data
 * @returns Registration result with user and JWT token
 */
export function registerUser(userData: {
  email: string
  password: string
  fullName: string
  role: UserRole
  phone?: string
  businessName?: string
  category?: string
  location?: string
  description?: string
  services?: string[]
  pricing?: string
  experience?: string
}): {
  success: boolean
  message: string
  user?: User
  token?: AuthToken
} {
  try {
    // Validate input
    const emailValidation = validateEmail(userData.email)
    if (!emailValidation.valid) {
      return { success: false, message: emailValidation.errors[0] }
    }

    const passwordValidation = validatePassword(userData.password)
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.errors[0] }
    }

    const users = getStoredUsers()

    // Check if email already exists
    if (users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new ConflictError('Email already registered')
    }

    // Create new user with hashed password
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const hashedPassword = hashPassword(userData.password)

    const newUser: User = {
      id: userId,
      email: userData.email.toLowerCase(),
      fullName: userData.fullName,
      role: userData.role,
      password: hashedPassword,
      phone: userData.phone,
      businessName: userData.businessName,
      category: userData.category,
      location: userData.location,
      description: userData.description,
      services: userData.services,
      pricing: userData.pricing,
      experience: userData.experience,
      approved: userData.role !== 'vendor' ? true : false,
      createdAt: new Date().toISOString(),
    }

    // Add to users list
    users.push(newUser)
    saveUsers(users)

    // Generate JWT token
    const token = generateJWT(userId, userData.email, userData.role)

    // Store JWT token
    storeToken(token)

    // Return without exposing password
    const userResponse = { ...newUser }
    delete userResponse.password

    return {
      success: true,
      message: 'Registration successful',
      user: userResponse,
      token,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'registerUser', email: userData.email })
    return { success: false, message: err.message }
  }
}

export async function registerUserApi(userData: {
  email: string
  password: string
  fullName: string
  role: UserRole
  phone?: string
  businessName?: string
  category?: string
  location?: string
  description?: string
  services?: string[]
  pricing?: string
  experience?: string
}): Promise<{ success: boolean; message: string; user?: User; token?: AuthToken }>
{
  try {
    const emailValidation = validateEmail(userData.email)
    if (!emailValidation.valid) {
      return { success: false, message: emailValidation.errors[0] }
    }

    const passwordValidation = validatePassword(userData.password)
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.errors[0] }
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role,
        phone: userData.phone,
        businessName: userData.businessName,
        category: userData.category,
        location: userData.location,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, message: err.message || 'Registration failed' }
    }

    const data = await response.json()

    // Vendor registration: backend returns token="" because vendors need admin
    // approval before they can log in. Treat this as a successful registration
    // without a session token — the caller checks role and shows the pending message.
    if (!data.token) {
      if (!data.user) {
        return { success: false, message: data.message || 'Registration failed' }
      }
      const pendingUser: User = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role,
        approved: data.user.approved,
        createdAt: data.user.createdAt || new Date().toISOString(),
      }
      return { success: true, message: data.message || 'Registration successful', user: pendingUser }
    }

    const tokenPayload = verifyJWT(data.token)
    if (!tokenPayload) {
      return { success: false, message: 'Invalid token from server' }
    }

    const user: User = {
      id: data.user?.id || tokenPayload.userId,
      email: data.user?.email || tokenPayload.email,
      fullName: data.user?.fullName || userData.fullName,
      role: data.user?.role || tokenPayload.role,
      approved: data.user?.approved,
      phone: data.user?.phone || userData.phone,
      location: data.user?.location || userData.location,
      businessName: data.user?.businessName || userData.businessName,
      category: data.user?.category || userData.category,
      createdAt: data.user?.createdAt || new Date().toISOString(),
    }

    const token: AuthToken = {
      token: data.token,
      payload: tokenPayload,
      expiresAt: tokenPayload.exp,
    }

    return { success: true, message: 'Registration successful', user, token }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'registerUserApi', email: userData.email })
    return { success: false, message: err.message }
  }
}

/**
 * Login user with enhanced security
 * @param email - User email
 * @param password - User password
 * @returns Login result with user and JWT token
 */
export function loginUser(
  email: string,
  password: string
): { success: boolean; message: string; user?: User; token?: AuthToken } {
  try {
    // Validate input
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      throw new AuthenticationError('Invalid email format')
    }

    const users = getStoredUsers()

    // Find user by email
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Verify password hash (for backward compatibility with old plaintext passwords)
    if (!user.password) {
      // Old format: plaintext password stored separately
      const passwordKey = `eventora_pwd_${user.id}`
      const storedPassword = typeof window !== 'undefined' ? localStorage.getItem(passwordKey) : null
      if (storedPassword !== password) {
        throw new AuthenticationError('Invalid email or password')
      }
    } else if (!verifyPasswordHash(password, user.password)) {
      // New format: hashed password
      throw new AuthenticationError('Invalid email or password')
    }

    // Check if vendor is approved
    if (user.role === 'vendor' && !user.approved) {
      return {
        success: false,
        message: 'Your vendor account is pending admin approval',
      }
    }

    // Generate JWT token
    const token = generateJWT(user.id, user.email, user.role)

    // Store token and auth state
    storeToken(token)
    const authState: AuthState = {
      user: { ...user, password: undefined },
      isAuthenticated: true,
      token: token.token,
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
    }

    return {
      success: true,
      message: 'Login successful',
      user: { ...user, password: undefined },
      token,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'loginUser', email })
    return { success: false, message: err.message }
  }
}

export async function loginUserApi(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User; token?: AuthToken }>
{
  try {
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return { success: false, message: 'Invalid email format' }
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, message: err.message || 'Invalid email or password' }
    }

    const data = await response.json()
    const tokenPayload = verifyJWT(data.token)
    if (!tokenPayload) {
      return { success: false, message: 'Invalid token from server' }
    }

    const user: User = {
      id: data.user?.id || tokenPayload.userId,
      email: data.user?.email || tokenPayload.email,
      fullName: data.user?.fullName || data.user?.email || 'User',
      role: data.user?.role || tokenPayload.role,
      approved: data.user?.approved,
      createdAt: data.user?.createdAt || new Date().toISOString(),
    }

    const token: AuthToken = {
      token: data.token,
      payload: tokenPayload,
      expiresAt: tokenPayload.exp,
    }

    return { success: true, message: 'Login successful', user, token }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'loginUserApi', email })
    return { success: false, message: err.message }
  }
}

/**
 * Logout user and clear session tokens
 */
export function logoutUser(): { success: boolean; message: string } {
  try {
    setAuthState(null)
    return { success: true, message: 'Logged out successfully' }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'logoutUser' })
    return { success: false, message: 'Logout failed' }
  }
}

export function updateCurrentUserPassword(currentPassword: string, newPassword: string): { success: boolean; message: string } {
  void currentPassword
  void newPassword
  throw new Error('Local demo password updates are disabled. Use updateMyPasswordApi() to update password via the backend.')
}

/**
 * Check if user has valid session
 * @returns True if user has valid JWT token
 */
export function isAuthenticated(): boolean {
  const tokenPayload = getCurrentTokenPayload()
  return tokenPayload !== null
}

/**
 * Get redirect URL based on user role
 * @param role - User role
 * @returns Redirect URL
 */
export function getRoleRedirectUrl(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'vendor':
      return '/vendor/dashboard'
    case 'customer':
      return '/customer/dashboard'
    default:
      return '/'
  }
}

/**
 * Initialize demo accounts for testing (development only)
 */
export function initializeDemoAccounts(): void {
  if (typeof window === 'undefined') return

  try {
    const users = getStoredUsers()

    // Only seed an admin account for local development to allow admin login
    const adminEmail = 'admin@example.com'
    const adminIndex = users.findIndex((u) => u.email === adminEmail)

    // If admin exists, ensure password matches current demo password for local login
    if (adminIndex >= 0) {
      const updatedAdmin = { ...users[adminIndex] }
      updatedAdmin.password = hashPassword('Demo123')
      users[adminIndex] = updatedAdmin
      saveUsers(users)
      return
    }

    const adminAccount = {
      email: adminEmail,
      password: 'Demo123',
      fullName: 'Admin User',
      role: 'admin' as UserRole,
    }

    const result = registerUser(adminAccount)
    if (!result.success) {
      ErrorLogger.log(new Error('Failed to create admin demo account'), { action: 'initializeDemoAccounts' })
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'initializeDemoAccounts' })
  }
}

/**
 * Get all vendors for admin approval
 * @returns Object with pending, approved, and rejected vendors
 */
export function getVendorsForApproval(): {
  pending: User[]
  approved: User[]
  rejected: User[]
} {
  const users = getStoredUsers()
  const vendors = users.filter((u) => u.role === 'vendor')

  return {
    pending: vendors.filter((v) => (v.approved === false || v.approved === undefined) && !v.rejectedAt),
    approved: vendors.filter((v) => v.approved === true),
    rejected: vendors.filter((v) => v.rejectedAt),
  }
}

/**
 * Approve vendor with notification
 * @param vendorId - Vendor ID to approve
 * @returns Approval result
 */
export function approveVendor(vendorId: string): { success: boolean; message: string } {
  try {
    const users = getStoredUsers()
    const vendorIndex = users.findIndex((u) => u.id === vendorId && u.role === 'vendor')

    if (vendorIndex === -1) {
      throw new NotFoundError('Vendor')
    }

    users[vendorIndex].approved = true
    users[vendorIndex].approvedAt = new Date().toISOString()
    users[vendorIndex].rejectedAt = undefined
    users[vendorIndex].rejectionReason = undefined

    saveUsers(users)

    // Create vendor approval notification
    if (typeof window !== 'undefined') {
      const { createNotification } = require('./data')
      createNotification({
        userId: vendorId,
        type: 'vendor_approved',
        title: 'Account Approved!',
        message: 'Congratulations! Your vendor account has been approved by the admin. You can now start accepting bookings.',
        read: false,
      })
    }

    return { success: true, message: 'Vendor approved successfully' }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'approveVendor', vendorId })
    return { success: false, message: err.message }
  }
}

/**
 * Reject vendor with notification
 * @param vendorId - Vendor ID to reject
 * @param reason - Rejection reason
 * @returns Rejection result
 */
export function rejectVendor(
  vendorId: string,
  reason: string
): { success: boolean; message: string } {
  try {
    const users = getStoredUsers()
    const vendorIndex = users.findIndex((u) => u.id === vendorId && u.role === 'vendor')

    if (vendorIndex === -1) {
      throw new NotFoundError('Vendor')
    }

    users[vendorIndex].approved = false
    users[vendorIndex].rejectedAt = new Date().toISOString()
    users[vendorIndex].rejectionReason = reason
    users[vendorIndex].approvedAt = undefined

    saveUsers(users)

    // Create vendor rejection notification
    if (typeof window !== 'undefined') {
      const { createNotification } = require('./data')
      createNotification({
        userId: vendorId,
        type: 'vendor_rejected',
        title: 'Application Not Approved',
        message: `Your vendor account application was not approved. Reason: ${reason}`,
        read: false,
      })
    }

    return { success: true, message: 'Vendor rejected' }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    ErrorLogger.log(err, { action: 'rejectVendor', vendorId })
    return { success: false, message: err.message }
  }
}

/**
 * Update user profile with validation
 * @param userId - User ID to update
 * @param updates - Profile updates
 * @returns Update result with updated user
 */
export function updateUserProfile(
  userId: string,
  updates: Partial<User>
): { success: boolean; message: string; user?: User } {
  void userId
  void updates
  throw new Error('Local demo profile updates are disabled. Use updateMeApi() to update the current user via the backend.')
}

export async function updateMeApi(
  updates: Partial<User>
): Promise<{ success: boolean; message: string; user?: User }>
{
  try {
    const updated = await apiFetch<User>('/api/users/me', {
      method: 'PUT',
      body: updates,
    })

    // Update the stored user object without touching the backend JWT.
    // Calling setAuthState(updated) without a token would replace the real
    // backend-signed JWT with a locally generated one, breaking subsequent requests.
    const existingToken = getStoredToken()
    setAuthState(updated, existingToken ?? undefined)

    return { success: true, message: 'Profile updated successfully', user: updated }
  } catch (error: any) {
    const message = error?.message || 'Failed to update profile'
    return { success: false, message }
  }
}

export async function updateMyPasswordApi(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }>
{
  try {
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.errors[0] }
    }

    await apiFetch('/api/users/me/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })

    return { success: true, message: 'Password updated successfully' }
  } catch (error: any) {
    const message = error?.message || 'Failed to update password'
    return { success: false, message }
  }
}
