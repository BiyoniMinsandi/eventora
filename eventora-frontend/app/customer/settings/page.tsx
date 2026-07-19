'use client'

/**
 * Route: /customer/settings
 * Purpose: Customer settings (security + notifications + preferences).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Save,
  ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { changePassword } from '@/lib/data'

export default function CustomerSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('preferences')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [deleteInput, setDeleteInput] = useState('')

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' })
      return
    }
    if (pwForm.next.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    setPwLoading(true)
    try {
      const res = await changePassword(pwForm.current, pwForm.next)
      toast({ title: 'Success', description: res.message })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update password', variant: 'destructive' })
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="customer" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences and privacy</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Account Preferences</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Preferred Language
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>English</option>
                        <option>Sinhala</option>
                        <option>Tamil</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Theme
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Light</option>
                        <option>Dark</option>
                        <option>Auto</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Currency Preference
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>LKR (Rs.)</option>
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Asia/Colombo (UTC+5:30)</option>
                        <option>Asia/Kolkata (UTC+5:30)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                  </div>

                  <Button className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted border-border"
                      value={pwForm.current}
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-muted border-border"
                        value={pwForm.next}
                        onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted border-border"
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="gap-2" disabled={pwLoading}>
                    <Lock className="w-4 h-4" />
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </Card>

              <Card className="p-8 bg-primary/5 border-primary/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Two-Factor Authentication
                </h2>
                <p className="text-muted-foreground mb-4">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline" className="gap-2 bg-transparent">
                  Enable Two-Factor Authentication
                </Button>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Settings
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Booking Confirmations',
                      description: 'When your bookings are confirmed or cancelled',
                      enabled: true,
                    },
                    {
                      title: 'Vendor Messages',
                      description: 'Messages from vendors about your booking',
                      enabled: true,
                    },
                    {
                      title: 'Event Reminders',
                      description: 'Reminders about upcoming events',
                      enabled: true,
                    },
                    {
                      title: 'Reviews Request',
                      description: 'Requests to review vendors after events',
                      enabled: true,
                    },
                    {
                      title: 'Special Offers',
                      description: 'Promotions and special deals from vendors',
                      enabled: false,
                    },
                    {
                      title: 'Weekly Newsletter',
                      description: 'Weekly updates about new vendors and features',
                      enabled: false,
                    },
                  ].map((notification) => (
                    <div
                      key={notification.title}
                      className="flex items-start justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={notification.enabled}
                        className="mt-1 w-5 h-5 rounded border-border cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <Button className="mt-6 gap-2">
                  <Save className="w-4 h-4" />
                  Save Notification Settings
                </Button>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Privacy & Data</h2>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Profile Visibility</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allow vendors to see your profile information
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-5 h-5 rounded border-border cursor-pointer"
                    />
                  </div>

                  <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Share Activity</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Help improve the platform by sharing usage analytics
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-5 h-5 rounded border-border cursor-pointer"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-8 border-border">
                <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  Delete Account
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Once deleted, your account and all associated data are permanently removed and cannot be recovered.
                </p>

                {deleteStep === 'idle' && (
                  <Button
                    variant="outline"
                    className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 bg-transparent"
                    onClick={() => setDeleteStep('confirm')}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </Button>
                )}

                {deleteStep === 'confirm' && (
                  <div className="space-y-4 max-w-sm">
                    <p className="text-sm font-medium text-foreground">
                      Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">DELETE</span> to confirm
                    </p>
                    <input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setDeleteStep('idle'); setDeleteInput('') }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
                        disabled={deleteInput !== 'DELETE'}
                        onClick={() => {
                          toast({ title: 'Account deletion requested', description: 'Please contact support to complete the process.' })
                          setDeleteStep('idle')
                          setDeleteInput('')
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Confirm Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
