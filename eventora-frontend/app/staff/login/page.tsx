'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { loginUserApi } from '@/lib/auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect already-authenticated users away from this page.
  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') {
      router.replace('/admin/dashboard')
    } else {
      // Customer or vendor stumbled here — send them to their own dashboard.
      router.replace(user.role === 'vendor' ? '/vendor/dashboard' : '/customer/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    const result = await loginUserApi(email, password)
    setLoading(false)

    if (!result.success || !result.user) {
      setError(result.message || 'Invalid credentials')
      return
    }

    if (result.user.role !== 'admin') {
      setError('Admin access only. This portal is restricted to administrators.')
      return
    }

    login(result.user, result.token)
    router.replace('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / identity */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Restricted access — authorised personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-4">

          {error && (
            <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>

        </form>
      </div>
    </div>
  )
}
