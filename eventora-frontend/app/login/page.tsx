'use client'

/**
 * Route: /login
 * Purpose: Sign in using local/demo auth and redirect by role.
 */

import React from "react"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, LogIn, Hourglass, XCircle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { loginUserApi, getRoleRedirectUrl } from '@/lib/auth'

type LoginStatus = 'credentials' | 'pending' | 'rejected' | 'error' | null

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginStatus, setLoginStatus] = useState<LoginStatus>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginStatus(null)

    if (!email || !password) {
      setLoginStatus('error')
      setErrorMsg('Please fill in all fields')
      return
    }

    setLoading(true)

    const result = await loginUserApi(email, password)

    if (result.success && result.user) {
      login(result.user, result.token)
      const redirectUrl = getRoleRedirectUrl(result.user.role)
      router.push(redirectUrl)
    } else {
      const msg = result.message || ''
      if (msg.startsWith('REJECTED:')) {
        setLoginStatus('rejected')
        setRejectionReason(msg.replace('REJECTED:', '').trim())
      } else if (msg.toLowerCase().includes('pending')) {
        setLoginStatus('pending')
      } else {
        setLoginStatus('credentials')
        setErrorMsg(msg)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4 min-h-[80vh]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your Eventora account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            {/* Rejected */}
            {loginStatus === 'rejected' && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Application rejected</p>
                  {rejectionReason && (
                    <p className="text-sm text-red-700 mt-0.5">Reason: {rejectionReason}</p>
                  )}
                  <p className="text-xs text-red-600 mt-1">Contact support if you think this is a mistake.</p>
                </div>
              </div>
            )}

            {/* Pending */}
            {loginStatus === 'pending' && (
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Hourglass className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Account pending approval</p>
                  <p className="text-sm text-amber-700 mt-0.5">Your vendor application is under review. You'll be notified within 2 working days.</p>
                </div>
              </div>
            )}

            {/* Generic / credentials error */}
            {(loginStatus === 'credentials' || loginStatus === 'error') && (
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

          </form>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
