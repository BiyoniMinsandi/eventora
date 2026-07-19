'use client'

/**
 * Authentication Provider Component
 * Manages user authentication state and JWT tokens
 * Provides auth context to entire application
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, getCurrentUser, setAuthState } from '@/lib/auth'
import {
  getCurrentTokenPayload,
  isTokenExpiringSoon,
  getStoredRefreshToken,
  verifyRefreshToken,
  storeToken,
  AuthToken,
} from '@/lib/jwt'
import { ErrorLogger } from '@/lib/errors'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token?: AuthToken | string) => void
  logout: () => void
  refreshUser: (user: User) => void
  hasValidToken: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasValidToken, setHasValidToken] = useState(false)

  const refreshToken = React.useCallback(() => {
    try {
      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        logout()
        return
      }

      const newToken = verifyRefreshToken(refreshToken)
      if (newToken) {
        storeToken(newToken)
        setHasValidToken(true)
      } else {
        logout()
      }
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
        action: 'Token refresh failed',
      })
      logout()
    }
  }, [])

  /**
   * Initialize authentication on component mount
   */
  useEffect(() => {
    try {
      // Check for existing valid JWT token
      const tokenPayload = getCurrentTokenPayload()
      if (tokenPayload) {
        const currentUser = getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setHasValidToken(true)

          // Check if token is expiring soon and attempt refresh
          if (isTokenExpiringSoon()) {
            refreshToken()
          }
        }
      }
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
        action: 'AuthProvider initialization',
      })
    } finally {
      setIsLoading(false)
    }
  }, [refreshToken])

  /**
   * Login user with authentication
   * @param userData - User data from login
   */
  const login = (userData: User, token?: AuthToken | string) => {
    try {
      setUser(userData)
      setAuthState(userData, token)
      setHasValidToken(true)
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
        action: 'AuthProvider login',
      })
    }
  }

  const refreshUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  /**
   * Logout user and clear tokens
   */
  const logout = () => {
    try {
      setUser(null)
      setHasValidToken(false)
      setAuthState(null)
    } catch (error) {
      ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
        action: 'AuthProvider logout',
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && hasValidToken,
        isLoading,
        login,
        logout,
        refreshUser,
        hasValidToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}