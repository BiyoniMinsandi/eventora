'use client'

/**
 * Route: /register
 * Purpose: Create a customer or vendor account (vendor accounts require admin approval).
 */

import React from "react"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/auth-provider'
import { registerUserApi, getRoleRedirectUrl, type UserRole } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [role, setRole] = useState<UserRole>('customer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Registration uses the backend API: validate fields, create user, then redirect.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Basic validation (keep UX fast, avoid calling auth with invalid state).
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    if (role === 'vendor' && (!businessName || !category || !location)) {
      setError('Please fill in all business details')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Email validation (simple regex for client-side feedback).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    const result = await registerUserApi({
      email,
      password,
      fullName,
      role,
      phone: phone || undefined,
      businessName: role === 'vendor' ? businessName : undefined,
      category: role === 'vendor' ? category : undefined,
      location: role === 'vendor' ? location : undefined,
    })

    if (result.success && result.user) {
      if (role === 'vendor') {
        // Vendors go to login after showing an approval message.
        setSuccess('Registration submitted! Your vendor application is under review. You will receive a response within 2 working days via email and in-app notification.')
        setLoading(false)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        login(result.user, result.token)
        const redirectUrl = getRoleRedirectUrl(result.user.role)
        router.push(redirectUrl)
      }
    } else {
      setError(result.message)
      setLoading(false)
    }
  }

  const customerFields = (
    <>
      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full Name
        </label>
        <Input
          id="fullName"
          placeholder=""
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          placeholder=""
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder=""
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
        />
      </div>
    </>
  )

  const vendorFields = (
    <>
      <div className="space-y-2">
        <label htmlFor="contactName" className="text-sm font-medium">
          Contact Name
        </label>
        <Input
          id="contactName"
          placeholder=""
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="businessName" className="text-sm font-medium">
          Business Name
        </label>
        <Input
          id="businessName"
          placeholder=""
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Service Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
          className={`w-full px-3 py-2 rounded-md border border-input bg-background text-sm ${category ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <option value="" disabled>Select a category</option>
          <option value="photography">Photography</option>
          <option value="catering">Catering</option>
          <option value="decoration">Decoration</option>
          <option value="venues">Venues</option>
          <option value="music">Music &amp; Entertainment</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-medium">
          Location / City
        </label>
        <select
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading}
          className={`w-full px-3 py-2 rounded-md border border-input bg-background text-sm ${location ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <option value="" disabled>Select a city</option>
          <option>Ampara</option>
          <option>Anuradhapura</option>
          <option>Badulla</option>
          <option>Batticaloa</option>
          <option>Colombo</option>
          <option>Galle</option>
          <option>Gampaha</option>
          <option>Hambantota</option>
          <option>Jaffna</option>
          <option>Kalutara</option>
          <option>Kandy</option>
          <option>Kegalle</option>
          <option>Kilinochchi</option>
          <option>Kurunegala</option>
          <option>Mannar</option>
          <option>Matale</option>
          <option>Matara</option>
          <option>Monaragala</option>
          <option>Mullaitivu</option>
          <option>Nuwara Eliya</option>
          <option>Polonnaruwa</option>
          <option>Puttalam</option>
          <option>Ratnapura</option>
          <option>Trincomalee</option>
          <option>Vavuniya</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="vendorEmail" className="text-sm font-medium">
          Email Address
        </label>
        <Input
          id="vendorEmail"
          type="email"
          placeholder=""
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="vendorPhone" className="text-sm font-medium">
          Phone Number
        </label>
        <Input
          id="vendorPhone"
          type="tel"
          placeholder=""
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
        />
      </div>
    </>
  )

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4 min-h-[80vh]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-muted-foreground text-sm">Join Eventora today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm" autoComplete="off">
            {/* Error Message */}
            {error && (
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
            )}

            {/* Role Selection */}
            <Tabs value={role} onValueChange={(value) => setRole(value as 'customer' | 'vendor')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer">Customer</TabsTrigger>
                <TabsTrigger value="vendor">Vendor</TabsTrigger>
              </TabsList>

              {/* Customer Form */}
              <TabsContent value="customer" className="space-y-4">
                {customerFields}
              </TabsContent>

              {/* Vendor Form */}
              <TabsContent value="vendor" className="space-y-4">
                {vendorFields}
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-primary font-medium">
                    ℹ️ Vendor accounts require admin approval before you can accept bookings.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
