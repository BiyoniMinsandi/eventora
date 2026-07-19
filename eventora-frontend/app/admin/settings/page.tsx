'use client'

/**
 * Route: /admin/settings
 * Purpose: Platform configuration screens (demo/local persistence).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateMyPasswordApi } from '@/lib/auth'
import {
  createAdminApiKey,
  getAdminApiKeys,
  getAdminSettings,
  revokeAdminApiKey,
  testAdminEmailSettings,
  updateAdminSettings,
  type AdminApiKey,
  type AdminSettings,
} from '@/lib/data'
import {
  Settings,
  Save,
  Lock,
  Zap,
  Mail,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'

export default function AdminSettings() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('system')
  const [saveMessage, setSaveMessage] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [settings, setSettings] = useState<AdminSettings>({
    platformName: 'Eventora',
    platformUrl: 'https://eventora.com',
    supportEmail: 'support@eventora.com',
    commissionRate: '15',
    maintenanceEnabled: false,
    maintenanceMessage: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpEmail: 'noreply@eventora.com',
    smtpPassword: '',
    twoFactorEnabled: false,
  })
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [apiKeys, setApiKeys] = useState<AdminApiKey[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [s, keys] = await Promise.all([getAdminSettings(), getAdminApiKeys()])
      if (cancelled) return
      setSettings(s)
      setApiKeys(keys)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const persistSettings = (nextSettings: typeof settings) => {
    setSettings(nextSettings)
  }

  const handleSavePlatform = async () => {
    const updated = await updateAdminSettings(settings)
    setSettings(updated)
    setSaveMessage('Platform settings saved.')
  }

  const handleSaveMaintenance = async () => {
    const updated = await updateAdminSettings(settings)
    setSettings(updated)
    setSaveMessage('Maintenance settings saved.')
  }

  const handleSaveEmail = async () => {
    const updated = await updateAdminSettings(settings)
    setSettings(updated)
    setEmailMessage('Email settings saved.')
  }

  const handleTestEmail = async () => {
    const res = await testAdminEmailSettings()
    setEmailMessage(res.message)
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

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">System Settings</h1>
              <p className="text-muted-foreground">Manage platform configuration and admin preferences</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="api">API Keys</TabsTrigger>
            </TabsList>

            {/* System Settings Tab */}
            <TabsContent value="system" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Settings
                </h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Platform Name
                      </label>
                      <Input
                        value={settings.platformName}
                        onChange={(event) =>
                          persistSettings({ ...settings, platformName: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Platform URL
                      </label>
                      <Input
                        value={settings.platformUrl}
                        onChange={(event) =>
                          persistSettings({ ...settings, platformUrl: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Support Email
                    </label>
                    <Input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(event) =>
                        persistSettings({ ...settings, supportEmail: event.target.value })
                      }
                      className="bg-muted border-border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Commission Rate (%)
                    </label>
                    <Input
                      type="number"
                      value={settings.commissionRate}
                      onChange={(event) =>
                        persistSettings({ ...settings, commissionRate: event.target.value })
                      }
                      className="bg-muted border-border"
                    />
                  </div>

                  <Button className="gap-2" onClick={handleSavePlatform}>
                    <Save className="w-4 h-4" />
                    Save Platform Settings
                  </Button>
                  {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}
                </div>
              </Card>

              <Card className="p-8">
                <h2 className="text-lg font-bold text-foreground mb-6">Maintenance Mode</h2>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Enable Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Platform will be temporarily unavailable for users
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-border cursor-pointer"
                      checked={settings.maintenanceEnabled}
                      onChange={(event) =>
                        persistSettings({ ...settings, maintenanceEnabled: event.target.checked })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Maintenance Message
                    </label>
                    <textarea
                      placeholder="We are currently performing scheduled maintenance..."
                      value={settings.maintenanceMessage}
                      onChange={(event) =>
                        persistSettings({ ...settings, maintenanceMessage: event.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>
                  <Button className="gap-2" onClick={handleSaveMaintenance}>
                    <Save className="w-4 h-4" />
                    Save Maintenance Settings
                  </Button>
                  {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}
                </div>
              </Card>
            </TabsContent>

            {/* Email Settings Tab */}
            <TabsContent value="email" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Configuration
                </h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        SMTP Host
                      </label>
                      <Input
                        value={settings.smtpHost}
                        onChange={(event) =>
                          persistSettings({ ...settings, smtpHost: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        SMTP Port
                      </label>
                      <Input
                        type="number"
                        value={settings.smtpPort}
                        onChange={(event) =>
                          persistSettings({ ...settings, smtpPort: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={settings.smtpEmail}
                        onChange={(event) =>
                          persistSettings({ ...settings, smtpEmail: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={settings.smtpPassword}
                        onChange={(event) =>
                          persistSettings({ ...settings, smtpPassword: event.target.value })
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>

                  <Button variant="outline" className="gap-2 bg-transparent" onClick={handleTestEmail}>
                    <Zap className="w-4 h-4" />
                    Test Email Configuration
                  </Button>

                  <Button className="gap-2" onClick={handleSaveEmail}>
                    <Save className="w-4 h-4" />
                    Save Email Settings
                  </Button>
                  {emailMessage && <p className="text-sm text-muted-foreground">{emailMessage}</p>}
                </div>
              </Card>
            </TabsContent>

            {/* Security Settings Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Change Password
                </h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted border-border"
                      value={passwordForm.current}
                      onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
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
                        value={passwordForm.next}
                        onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
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
                      value={passwordForm.confirm}
                      onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                    />
                  </div>

                  <Button className="gap-2" onClick={handleUpdatePassword}>
                    <Lock className="w-4 h-4" />
                    Update Password
                  </Button>
                  {securityMessage && <p className="text-sm text-muted-foreground">{securityMessage}</p>}
                </div>
              </Card>

              <Card className="p-8 bg-primary/5 border-primary/20">
                <h2 className="text-lg font-bold text-foreground mb-4">Two-Factor Authentication</h2>
                <p className="text-muted-foreground mb-4">
                  Protect your admin account with two-factor authentication
                </p>
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={() => persistSettings({ ...settings, twoFactorEnabled: !settings.twoFactorEnabled })}
                >
                  {settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">API Keys Management</h2>
                <p className="text-muted-foreground mb-6">
                  API keys are used to authenticate requests to the Eventora API
                </p>

                <div className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-foreground">API Key</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Created on {key.createdAt}
                            </p>
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
                          <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleCopyKey(key.key)}>
                            Copy Key
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
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

                  <Button className="gap-2" onClick={handleGenerateKey}>
                    <Zap className="w-4 h-4" />
                    Generate New API Key
                  </Button>
                </div>
              </Card>

              <Card className="p-8 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-orange-900 mb-1">Security Notice</h3>
                    <p className="text-sm text-orange-800">
                      Never share your API keys publicly. Treat them like passwords. If you suspect
                      a key has been compromised, revoke it immediately.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
