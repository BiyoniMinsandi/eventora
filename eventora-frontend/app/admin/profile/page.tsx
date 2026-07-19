'use client'

/**
 * Route: /admin/profile
 * Purpose: Admin account profile + security settings.
 */

import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, User, Bell, Shield, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { updateMeApi, updateMyPasswordApi } from '@/lib/auth'
import { createAdminApiKey, getAdminApiKeys, getUserNotifications, markAllNotificationsAsRead, revokeAdminApiKey, type AdminApiKey } from '@/lib/data'

export default function AdminProfilePage() {
  const { user, login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<AdminApiKey[]>([])

  useEffect(() => {
    if (!user) return
    setProfile({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
    })

    let cancelled = false
    ;(async () => {
      const [n, keys] = await Promise.all([getUserNotifications(user.id), getAdminApiKeys()])
      if (cancelled) return
      setNotifications(n)
      setApiKeys(keys)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '—'
    return new Date(user.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    const result = await updateMeApi({ fullName: profile.fullName, phone: profile.phone })
    if (result.success && result.user) login(result.user)
    setSaveMessage(result.message)
    setIsSaving(false)
  }

  const handleUpdatePassword = async () => {
    setSecurityMessage('')
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setSecurityMessage('Please fill in all password fields.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setSecurityMessage('New passwords do not match.')
      return
    }
    const result = await updateMyPasswordApi(passwordForm.current, passwordForm.next)
    setSecurityMessage(result.message)
    if (result.success) {
      setPasswordForm({ current: '', next: '', confirm: '' })
    }
  }

  const handleGenerateKey = async () => {
    const created = await createAdminApiKey()
    setApiKeys([created, ...apiKeys])
  }

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setSaveMessage('API key copied.')
    } catch {
      setSaveMessage('Unable to copy API key.')
    }
  }

  const handleRevokeKey = async (id: string) => {
    await revokeAdminApiKey(id)
    setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)))
  }

  const handleMarkNotificationsRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.id)
    const refreshed = await getUserNotifications(user.id)
    setNotifications(refreshed)
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings and security</p>
          </div>
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList className="bg-white border border-border p-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Shield className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Profile Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <Input
                      value={profile.fullName}
                      onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                      className="bg-muted/50"
                      placeholder="Full Name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <Input
                      value={profile.email}
                      className="bg-muted/50"
                      type="email"
                      placeholder="Email"
                      disabled
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <Input
                      value={profile.phone}
                      onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                      className="bg-muted/50"
                      placeholder="Phone"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Role
                    </label>
                    <Input
                      value="Administrator"
                      className="bg-muted/50"
                      disabled
                      placeholder="Role"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-border mb-8">
                  {/* Join Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Join Date
                    </label>
                    <Input
                      value={memberSince}
                      className="bg-muted/50"
                      disabled
                      placeholder="Join Date"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Account Status
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 font-medium">Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
                {saveMessage && <p className="text-sm text-muted-foreground mt-3">{saveMessage}</p>}
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              {/* Change Password */}
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Change Password</h2>
                
                <div className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        className="pr-10"
                        value={passwordForm.current}
                        onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        className="pr-10"
                        value={passwordForm.next}
                        onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                      />
                      <button
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 8 characters with uppercase, lowercase, numbers, and symbols
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        className="pr-10"
                        value={passwordForm.confirm}
                        onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                      />
                      <button
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border mt-6 flex justify-end">
                  <Button onClick={handleUpdatePassword}>Update Password</Button>
                </div>
                {securityMessage && <p className="text-sm text-muted-foreground mt-3">{securityMessage}</p>}
              </Card>

              {/* Two Factor Authentication */}
              <Card className="p-8 border-green-200 bg-green-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <h3 className="text-xl font-bold text-green-900">Two-Factor Authentication</h3>
                    </div>
                    <p className="text-green-800">
                      Two-factor authentication is enabled on your account. This adds an extra layer of security.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white border-green-300">
                    Manage
                  </Button>
                </div>
              </Card>

              {/* API Keys */}
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">API Keys</h2>
                <p className="text-muted-foreground mb-6">
                  API keys are used to authenticate requests to the Eventora API.
                </p>
                <div className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-foreground">API Key</p>
                            <p className="text-sm text-muted-foreground mt-1">Created on {key.createdAt}</p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {key.status === 'active' ? 'Active' : 'Revoked'}
                          </span>
                        </div>
                        <div className="bg-background p-3 rounded font-mono text-xs text-foreground overflow-x-auto mb-3">
                          {key.key}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => handleCopyKey(key.key)}>
                            Copy Key
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={key.status === 'revoked'}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button className="mt-6" onClick={handleGenerateKey}>Create New API Key</Button>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
                  <Button variant="outline" onClick={handleMarkNotificationsRead}>Mark all read</Button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-muted-foreground">No notifications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((note) => (
                      <div key={note.id} className="border border-border rounded-lg p-3">
                        <p className="text-sm font-medium text-foreground">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{note.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Login Activity</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">No activity logs yet.</p>
                  </div>
                </div>
              </Card>

              {/* Session Management */}
              <Card className="p-8 border-orange-200 bg-orange-50">
                <h2 className="text-xl font-bold text-orange-900 mb-4">Active Sessions</h2>
                <p className="text-orange-800 mb-4">
                  You are currently logged in on 1 device.
                </p>
                <Button variant="outline" className="bg-white border-orange-300">
                  Sign Out All Other Sessions
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
