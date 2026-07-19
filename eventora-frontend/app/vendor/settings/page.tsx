'use client'

/**
 * Route: /vendor/settings
 * Purpose: Vendor settings (general profile fields + security + notifications).
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Bell, CreditCard, Save, Eye, EyeOff, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { changePassword } from '@/lib/data'
import { useAuth } from '@/components/auth-provider'
import { updateMeApi } from '@/lib/auth'

export default function VendorSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, refreshUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  // General tab state
  const [genForm, setGenForm] = useState({
    businessName: '',
    category: '',
    description: '',
    email: '',
    phone: '',
    location: '',
  })
  const [genSaving, setGenSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setGenForm({
        businessName: user.businessName || '',
        category: user.category || '',
        description: user.description || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
      })
    }
  }, [user])

  const handleGenSave = async () => {
    setGenSaving(true)
    const result = await updateMeApi({
      businessName: genForm.businessName,
      category: genForm.category,
      description: genForm.description,
      phone: genForm.phone,
      location: genForm.location,
    })
    setGenSaving(false)
    if (result.success) {
      if (result.user) refreshUser(result.user)
      toast({ title: 'Settings saved' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

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

  const handlePaymentAction = () => {
    toast({
      title: 'Payment methods',
      description: 'Payment method management is handled through Stripe. Contact support to update your payout details.',
    })
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
              <p className="text-muted-foreground">Manage your vendor account and preferences</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Business Information</h2>
                  <Button variant="outline" asChild size="sm" className="gap-2 bg-transparent">
                    <Link href="/vendor/profile">
                      <ExternalLink className="w-4 h-4" />
                      Full Profile Editor
                    </Link>
                  </Button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Business Name</label>
                      <Input
                        value={genForm.businessName}
                        onChange={e => setGenForm(p => ({ ...p, businessName: e.target.value }))}
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Business Category</label>
                      <select
                        value={genForm.category}
                        onChange={e => setGenForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm text-foreground"
                      >
                        <option value="">Select a category</option>
                        <option value="photography">Photography</option>
                        <option value="catering">Catering</option>
                        <option value="decoration">Decoration</option>
                        <option value="venues">Venues</option>
                        <option value="music">Music &amp; Entertainment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Business Description</label>
                    <textarea
                      value={genForm.description}
                      onChange={e => setGenForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Describe your business..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                      <Input
                        type="email"
                        value={genForm.email}
                        readOnly
                        className="bg-muted border-border opacity-60 cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                      <Input
                        value={genForm.phone}
                        onChange={e => setGenForm(p => ({ ...p, phone: e.target.value }))}
                        className="bg-muted border-border"
                        placeholder="+94 77 123 4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">City</label>
                      <select
                        value={genForm.location}
                        onChange={e => setGenForm(p => ({ ...p, location: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm text-foreground"
                      >
                        <option value="">Select a city</option>
                        {['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
                          'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
                          'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
                          'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya',
                        ].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <Button className="gap-2" onClick={handleGenSave} disabled={genSaving}>
                    <Save className="w-4 h-4" />
                    {genSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Security Settings Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                    <Input
                      type="password"
                      placeholder="Current password"
                      className="bg-muted border-border"
                      value={pwForm.current}
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password"
                        className="bg-muted border-border pr-10"
                        value={pwForm.next}
                        onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
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
            </TabsContent>

            {/* Payments Settings Tab */}
            <TabsContent value="payments" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Payments are processed through Stripe. Contact support to update your payout details.
                </p>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg bg-muted/50 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">Stripe Connect</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your payouts are managed through Stripe
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent" onClick={handlePaymentAction}>
                      Update
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={handlePaymentAction}>
                    <CreditCard className="w-4 h-4" />
                    Add Payment Method
                  </Button>
                </div>
              </Card>

              <Card className="p-8">
                <h2 className="text-lg font-bold text-foreground mb-6">Payout Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Minimum Payout Amount
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">Rs.</span>
                      <Input
                        type="number"
                        defaultValue="5000"
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Payout Frequency</label>
                    <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>On Demand</option>
                    </select>
                  </div>

                  <Button className="gap-2" onClick={handlePaymentAction}>
                    <Save className="w-4 h-4" />
                    Save Payout Settings
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Notifications Settings Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </h2>
                <div className="space-y-4">
                  {[
                    { title: 'New Booking Requests', description: 'Get notified when customers request your services', enabled: true },
                    { title: 'Booking Updates', description: 'Updates on confirmed bookings and changes', enabled: true },
                    { title: 'Customer Messages', description: 'Messages from customers', enabled: true },
                    { title: 'Reviews & Ratings', description: 'When customers leave reviews', enabled: true },
                    { title: 'Platform Updates', description: 'Important updates about the platform', enabled: false },
                    { title: 'Marketing & Promotions', description: 'Promotional offers and updates', enabled: false },
                  ].map((notification) => (
                    <div key={notification.title} className="flex items-start justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={notification.enabled}
                        className="mt-1 w-5 h-5 rounded border-border cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
                <Button className="mt-6 gap-2" onClick={() => toast({ title: 'Preferences saved' })}>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
