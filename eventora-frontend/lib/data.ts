/**
 * All data access functions for the Eventora frontend.
 * Every function calls the .NET backend via apiFetch (which attaches the Bearer token).
 * Admin-only functions (getAdminUsers, getReviews, etc.) will 403 if called by a non-admin.
 */

import { apiFetch } from '@/lib/api'
import { getCurrentUser, type User } from '@/lib/auth'

export interface Booking {
  id: string
  customerId: string
  customerName: string
  vendorId: string
  vendorName: string
  vendorBusinessName: string
  service: string
  eventDate: string
  eventType: string
  guestCount?: number
  budget?: string
  specialRequests?: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'cancellation_pending'
  vendorResponseNote?: string
  paymentId?: string
  paymentStatus: 'unpaid' | 'pending' | 'processing' | 'paid' | 'refunded' | 'failed'
  amountInCents?: number
  currency: string
  createdAt: string
  updatedAt: string
  cancellationRequestedBy?: string
  cancellationReason?: string
  cancellationProofUrl?: string
  vendorRefundConfirmed?: boolean
  cancellationRequestedAt?: string
}

export interface Notification {
  id: string
  userId: string
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected' | 'booking_completed' | 'review_prompt' | 'dispute_update' | 'message' | 'vendor_approved' | 'vendor_rejected'
  title: string
  message: string
  relatedBookingId?: string
  relatedDisputeId?: string
  read: boolean
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
}

export interface Conversation {
  id: string
  customerId: string
  customerName: string
  vendorId: string
  vendorName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  bookingId?: string
}

export interface Review {
  id: string
  bookingId: string
  customerId: string
  customerName: string
  vendorId: string
  rating: number
  comment: string
  createdAt: string
}

export interface Dispute {
  id: string
  bookingId: string
  customerId: string
  customerName: string
  vendorId: string
  vendorName: string
  title: string
  description: string
  category: 'quality' | 'behavior' | 'payment' | 'schedule' | 'damage' | 'other'
  evidence?: string[]
  status: 'open' | 'in-review' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  resolution?: string
}

export interface DisputeMessage {
  id: string
  disputeId: string
  senderId: string
  senderName: string
  senderRole: 'customer' | 'vendor' | 'admin'
  content: string
  timestamp: string
}

// ── Vendors ──────────────────────────────────────────────────────────────────

// Category and price range are filtered server-side. Text search is done
// client-side on the returned list for instant feedback while typing.
export async function getVendors(params?: { search?: string; category?: string; location?: string; minPrice?: number; maxPrice?: number }): Promise<User[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.category) qs.set('category', params.category)
  if (params?.location) qs.set('location', params.location)
  if (params?.minPrice != null) qs.set('minPrice', String(params.minPrice))
  if (params?.maxPrice != null) qs.set('maxPrice', String(params.maxPrice))

  const suffix = qs.toString() ? `?${qs}` : ''
  return await apiFetch<User[]>(`/api/vendors${suffix}`, { auth: false })
}

export async function getVendorById(id: string): Promise<User> {
  return await apiFetch<User>(`/api/vendors/${id}`, { auth: false })
}

// Admin users & vendor approvals
export async function getAdminUsers(): Promise<User[]> {
  return await apiFetch<User[]>(`/api/admin/users`)
}

export async function getPendingVendors(): Promise<User[]> {
  return await apiFetch<User[]>(`/api/admin/vendors/pending`)
}

export async function approveVendor(vendorId: string): Promise<User> {
  return await apiFetch<User>(`/api/admin/vendors/${vendorId}/approve`, { method: 'POST', body: {} })
}

export async function rejectVendor(vendorId: string, reason: string): Promise<User> {
  return await apiFetch<User>(`/api/admin/vendors/${vendorId}/reject`, { method: 'POST', body: { reason } })
}

export async function suspendUser(userId: string, reason?: string): Promise<User> {
  return await apiFetch<User>(`/api/admin/users/${userId}/suspend`, { method: 'POST', body: { reason } })
}

export async function unsuspendUser(userId: string): Promise<User> {
  return await apiFetch<User>(`/api/admin/users/${userId}/unsuspend`, { method: 'POST', body: {} })
}

// ── Bookings ─────────────────────────────────────────────────────────────────

// Admins call the dedicated /api/admin/bookings route which returns all bookings.
// Customers and vendors get only their own via /api/bookings (enforced server-side).
export async function getBookings(): Promise<Booking[]> {
  const user = getCurrentUser()
  if (user?.role === 'admin') {
    return await apiFetch<Booking[]>(`/api/admin/bookings`)
  }

  return await apiFetch<Booking[]>(`/api/bookings`)
}

export async function getUserBookings(userId: string, role: 'customer' | 'vendor'): Promise<Booking[]> {
  const list = await getBookings()
  return list.filter((b) => (role === 'customer' ? b.customerId === userId : b.vendorId === userId))
}

export async function createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
  return await apiFetch<Booking>(`/api/bookings`, {
    method: 'POST',
    body: {
      vendorId: bookingData.vendorId,
      service: bookingData.service,
      eventDate: bookingData.eventDate,
      eventType: bookingData.eventType,
      guestCount: bookingData.guestCount,
      budget: bookingData.budget,
      specialRequests: bookingData.specialRequests,
    },
  })
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  vendorResponseNote?: string
): Promise<Booking> {
  switch (status) {
    case 'accepted':
      return await apiFetch<Booking>(`/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        body: { vendorResponseNote },
      })
    case 'rejected':
      return await apiFetch<Booking>(`/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        body: { vendorResponseNote },
      })
    case 'cancelled':
      return await apiFetch<Booking>(`/api/bookings/${bookingId}/cancel`, { method: 'POST', body: {} })
    case 'completed':
      return await apiFetch<Booking>(`/api/bookings/${bookingId}/complete`, { method: 'POST', body: {} })
    default:
      throw new Error(`Unsupported booking transition: ${status}`)
  }
}

export async function requestCancellation(
  bookingId: string,
  reason: string,
  proofUrl?: string,
  refundConfirmed?: boolean
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  try {
    const booking = await apiFetch<Booking>(`/api/bookings/${bookingId}/request-cancellation`, {
      method: 'POST',
      body: { reason, proofUrl, refundConfirmed: refundConfirmed ?? false },
    })
    return { success: true, message: 'Cancellation request submitted', booking }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to submit cancellation request' }
  }
}

export async function approveCancellation(bookingId: string): Promise<{ success: boolean; message: string }> {
  try {
    await apiFetch(`/api/admin/bookings/${bookingId}/approve-cancellation`, { method: 'POST', body: {} })
    return { success: true, message: 'Cancellation approved' }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to approve cancellation' }
  }
}

export async function rejectCancellation(bookingId: string): Promise<{ success: boolean; message: string }> {
  try {
    await apiFetch(`/api/admin/bookings/${bookingId}/reject-cancellation`, { method: 'POST', body: {} })
    return { success: true, message: 'Cancellation request rejected' }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to reject cancellation' }
  }
}

export async function getBookingById(bookingId: string): Promise<Booking | undefined> {
  try {
    return await apiFetch<Booking>(`/api/bookings/${bookingId}`)
  } catch (e: any) {
    if (e?.status === 404) return undefined
    throw e
  }
}

// ── Messaging ────────────────────────────────────────────────────────────────

export async function getUserConversations(userId: string, role: 'customer' | 'vendor'): Promise<Conversation[]> {
  const list = await apiFetch<Conversation[]>(`/api/conversations`)
  return list.filter((c) => (role === 'customer' ? c.customerId === userId : c.vendorId === userId))
}

// Pass bookingId whenever possible so the server can enforce the active-booking
// messaging rule and create a booking-scoped thread.
export async function getOrCreateConversation(
  customerId: string,
  customerName: string,
  vendorId: string,
  vendorName: string,
  bookingId?: string
): Promise<string> {
  const res = await apiFetch<{ id: string }>(`/api/conversations/get-or-create`, {
    method: 'POST',
    body: { customerId, customerName, vendorId, vendorName, bookingId },
  })
  return res.id
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  return await apiFetch<Message[]>(`/api/conversations/${conversationId}/messages`)
}

export async function sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<Message> {
  return await apiFetch<Message>(`/api/conversations/${messageData.conversationId}/messages`, {
    method: 'POST',
    body: { receiverId: messageData.receiverId, content: messageData.content },
  })
}

export async function markConversationAsRead(conversationId: string, _userId: string): Promise<void> {
  await apiFetch(`/api/conversations/${conversationId}/read`, { method: 'POST', body: {} })
}

// ── Reviews ──────────────────────────────────────────────────────────────────

// Reviews can only be submitted for Completed bookings (enforced server-side).
export async function getVendorReviews(vendorId: string): Promise<Review[]> {
  return await apiFetch<Review[]>(`/api/reviews/vendor/${vendorId}`, { auth: false })
}

export async function getReviewByBookingId(bookingId: string): Promise<Review | undefined> {
  try {
    return await apiFetch<Review>(`/api/reviews/booking/${bookingId}`)
  } catch (e: any) {
    if (e?.status === 404) return undefined
    throw e
  }
}

export async function hasUserReviewedBooking(bookingId: string): Promise<boolean> {
  const review = await getReviewByBookingId(bookingId)
  return !!review
}

export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
  return await apiFetch<Review>(`/api/reviews`, {
    method: 'POST',
    body: { bookingId: reviewData.bookingId, rating: reviewData.rating, comment: reviewData.comment },
  })
}

export async function getVendorAverageRating(vendorId: string): Promise<number> {
  const reviews = await getVendorReviews(vendorId)
  if (reviews.length === 0) return 0
  return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
}

export async function getReviews(): Promise<Review[]> {
  // Admin list
  return await apiFetch<Review[]>(`/api/admin/reviews`)
}

export async function deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
  await apiFetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' })
  return { success: true, message: 'Review removed successfully' }
}

// Statistics
export async function getBookingStats(userId: string, role: 'customer' | 'vendor') {
  const bookings = await getUserBookings(userId, role)
  return {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }
}

// ── Disputes ─────────────────────────────────────────────────────────────────

// The server returns all disputes to admins, only own disputes to customers/vendors.
export async function getDisputes(): Promise<Dispute[]> {
  return await apiFetch<Dispute[]>(`/api/disputes`)
}

export async function getUserDisputes(userId: string, role: 'customer' | 'vendor'): Promise<Dispute[]> {
  const list = await getDisputes()
  return list.filter((d) => (role === 'customer' ? d.customerId === userId : d.vendorId === userId))
}

export async function getDisputeByBookingId(bookingId: string): Promise<Dispute | undefined> {
  const list = await getDisputes()
  return list.find((d) => d.bookingId === bookingId)
}

export async function hasDisputeForBooking(bookingId: string): Promise<boolean> {
  const disputes = await getDisputes()
  return disputes.some((d) => d.bookingId === bookingId && (d.status === 'open' || d.status === 'in-review'))
}

export async function canCreateDispute(customerId: string, bookingId: string): Promise<{ can: boolean; message?: string }> {
  const booking = await getBookingById(bookingId)
  if (!booking) return { can: false, message: 'Booking not found' }

  if (booking.customerId !== customerId) {
    return { can: false, message: 'You can only dispute your own bookings' }
  }

  if (booking.status !== 'completed' && booking.status !== 'accepted') {
    return {
      can: false,
      message: `You can only dispute completed or accepted bookings, this booking is ${booking.status}`,
    }
  }

  const existing = await getDisputeByBookingId(bookingId)
  if (existing && (existing.status === 'open' || existing.status === 'in-review')) {
    return { can: false, message: 'An active dispute already exists for this booking' }
  }

  return { can: true }
}

export async function createDispute(
  disputeData: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'resolution'>
): Promise<{ success: boolean; message: string; dispute?: Dispute }> {
  try {
    const dispute = await apiFetch<Dispute>(`/api/disputes`, {
      method: 'POST',
      body: {
        bookingId: disputeData.bookingId,
        title: disputeData.title,
        description: disputeData.description,
        category: disputeData.category,
        evidence: disputeData.evidence,
      },
    })
    return { success: true, message: 'Dispute created successfully', dispute }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to create dispute' }
  }
}

export async function reportCustomer(
  bookingId: string,
  title: string,
  description: string,
  category: string = 'behavior'
): Promise<{ success: boolean; message: string; dispute?: Dispute }> {
  try {
    const dispute = await apiFetch<Dispute>(`/api/disputes/vendor-report`, {
      method: 'POST',
      body: { bookingId, title, description, category },
    })
    return { success: true, message: 'Report submitted. An admin will review it.', dispute }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to submit report' }
  }
}

export async function updateDisputeStatus(disputeId: string, status: Dispute['status'], resolution?: string): Promise<boolean> {
  await apiFetch(`/api/admin/disputes/${disputeId}`, {
    method: 'PATCH',
    body: { status, resolution },
  })
  return true
}

// Notifications
export async function getUserNotifications(_userId: string): Promise<Notification[]> {
  const list = await apiFetch<Notification[]>(`/api/notifications`)
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const list = await getUserNotifications(userId)
  return list.filter((n) => !n.read).length
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'POST', body: {} })
}

export async function markAllNotificationsAsRead(_userId: string): Promise<void> {
  await apiFetch(`/api/notifications/read-all`, { method: 'POST', body: {} })
}

// Client-side notifications are no longer supported; the server is the source of truth.
export function createNotification(): never {
  throw new Error('Notifications are created by the server. Remove createNotification() calls.')
}

// Admin settings & content (platform configuration)
export interface AdminApiKey {
  id: string
  key: string
  createdAt: string
  status: 'active' | 'revoked'
}

export interface AdminSettings {
  platformName: string
  platformUrl: string
  supportEmail: string
  commissionRate: string
  maintenanceEnabled: boolean
  maintenanceMessage: string
  smtpHost: string
  smtpPort: string
  smtpEmail: string
  smtpPassword?: string
  twoFactorEnabled: boolean
}

export async function getAdminSettings(): Promise<AdminSettings> {
  return await apiFetch<AdminSettings>(`/api/admin/settings`)
}

export async function updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
  return await apiFetch<AdminSettings>(`/api/admin/settings`, { method: 'PUT', body: settings })
}

export async function testAdminEmailSettings(): Promise<{ success: boolean; message: string }> {
  return await apiFetch<{ success: boolean; message: string }>(`/api/admin/settings/test-email`, { method: 'POST', body: {} })
}

export async function getAdminApiKeys(): Promise<AdminApiKey[]> {
  return await apiFetch<AdminApiKey[]>(`/api/admin/api-keys`)
}

export async function createAdminApiKey(): Promise<AdminApiKey> {
  return await apiFetch<AdminApiKey>(`/api/admin/api-keys`, { method: 'POST', body: {} })
}

export async function revokeAdminApiKey(keyId: string): Promise<void> {
  await apiFetch(`/api/admin/api-keys/${keyId}/revoke`, { method: 'POST', body: {} })
}

export interface AdminPage {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft'
  views?: number
  lastUpdated?: string
}

export interface AdminFaq {
  id: string
  question: string
  answer?: string
  category?: string
  status: 'published' | 'draft'
  views?: number
}

export interface AdminCategory {
  id: string
  name: string
  active: boolean
  vendors?: number
}

export async function getAdminPages(): Promise<AdminPage[]> {
  return await apiFetch<AdminPage[]>(`/api/admin/content/pages`)
}

export async function getAdminFaqs(): Promise<AdminFaq[]> {
  return await apiFetch<AdminFaq[]>(`/api/admin/content/faqs`)
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return await apiFetch<AdminCategory[]>(`/api/admin/content/categories`)
}

// ── Dispute messages ─────────────────────────────────────────────────────────

export async function getDisputeMessages(disputeId: string): Promise<DisputeMessage[]> {
  return await apiFetch<DisputeMessage[]>(`/api/disputes/${disputeId}/messages`)
}

export async function sendDisputeMessage(disputeId: string, content: string): Promise<DisputeMessage> {
  return await apiFetch<DisputeMessage>(`/api/disputes/${disputeId}/messages`, {
    method: 'POST',
    body: { content },
  })
}

// ── Account security ─────────────────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/api/users/me/password`, {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  bookingId: string
  amountInCents: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  createdAt: string
}

export async function createCheckoutSession(bookingId: string, amountInCents: number): Promise<{ checkoutUrl: string; sessionId: string; paymentId: string }> {
  return await apiFetch(`/api/payments/checkout`, {
    method: 'POST',
    body: { bookingId, amountInCents },
  })
}

export async function getBookingPayment(bookingId: string): Promise<{ status: string; payment: Payment | null }> {
  return await apiFetch(`/api/payments/booking/${bookingId}`)
}

export async function verifyPaymentSession(sessionId: string): Promise<{ paymentStatus: string; bookingId: string; amountInCents: number; currency: string }> {
  return await apiFetch(`/api/payments/verify-session`, {
    method: 'POST',
    body: { sessionId },
  })
}

export async function getMyPayments(): Promise<Payment[]> {
  return await apiFetch<Payment[]>(`/api/payments/my`)
}

// ── Public categories ─────────────────────────────────────────────────────────

export interface PublicCategory {
  id: string
  name: string
  slug: string
  active: boolean
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  try {
    return await apiFetch<PublicCategory[]>(`/api/categories`, { auth: false })
  } catch {
    // Fall back to defaults if the endpoint is unavailable
    return [
      { id: '1', name: 'Photographers', slug: 'photography', active: true },
      { id: '2', name: 'Caterers', slug: 'catering', active: true },
      { id: '3', name: 'Decorators', slug: 'decoration', active: true },
      { id: '4', name: 'Venues', slug: 'venues', active: true },
      { id: '5', name: 'Musicians', slug: 'music', active: true },
    ]
  }
}