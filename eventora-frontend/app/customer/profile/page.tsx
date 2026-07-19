'use client'

/**
 * Route: /customer/profile
 * Purpose: Customer profile management.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { getUserBookings, type Booking, getUserNotifications, markAllNotificationsAsRead } from '@/lib/data'
import { updateMeApi, updateMyPasswordApi } from '@/lib/auth'

export default function CustomerProfilePage() {
  const router = useRouter()
  const { user, login } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [message, setMessage] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    setProfile({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
    })

    let cancelled = false
    ;(async () => {
      const [b, n] = await Promise.all([getUserBookings(user.id, 'customer'), getUserNotifications(user.id)])
      if (cancelled) return
      setBookings(b)
      setNotifications(n)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    const result = await updateMeApi({
      fullName: profile.fullName,
      phone: profile.phone,
      location: profile.location,
    })
    if (result.success) {
      if (result.user) login(result.user)
      setMessage('Profile updated successfully.')
      setEditMode(false)
    } else {
      setMessage(result.message)
    }
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

  const handleMarkNotificationsRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.id)
    const refreshed = await getUserNotifications(user.id)
    setNotifications(refreshed)
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="customer" userName={user?.fullName || 'Customer'} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
              <p className="text-muted-foreground">Manage your account and booking details</p>
            </div>
          </div>

          {/* Profile Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full md:w-max grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6 space-y-6">
              <Card className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Personal Information</h2>
                  <Button
                    onClick={() => {
                      if (editMode) {
                        handleSaveProfile()
                      } else {
                        setMessage('')
                        setEditMode(true)
                      }
                    }}
                    variant={editMode ? 'default' : 'outline'}
                  >
                    {editMode ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </div>
                {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <Input
                      value={profile.fullName}
                      onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                      disabled={!editMode}
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <Input
                      value={profile.phone}
                      onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                      disabled={!editMode}
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <Input
                      value={profile.location}
                      onChange={(event) => setProfile({ ...profile, location: event.target.value })}
                      disabled={!editMode}
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                    <p className="text-lg font-semibold text-foreground">{memberSince}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className="text-lg font-semibold text-primary">Active</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6 space-y-4">
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No bookings yet.</p>
                  </Card>
                ) : (
                  bookings.map((booking) => (
                    <Card key={booking.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-foreground">
                              {booking.vendorBusinessName || booking.vendorName}
                            </h3>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(booking.status)}
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                  booking.status
                                )}`}
                              >
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Service</p>
                              <p className="text-sm font-medium text-foreground">
                                {booking.service || 'Event Service'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Event Date</p>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(booking.eventDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Booked On</p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(booking.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          {booking.budget && (
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground">Budget</p>
                              <p className="text-lg font-semibold text-primary">{booking.budget}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Security Settings</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted"
                      value={passwordForm.current}
                      onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted"
                      value={passwordForm.next}
                      onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-muted"
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
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-muted-foreground">Your recent notifications</p>
                  <Button variant="outline" onClick={handleMarkNotificationsRead}>
                    Mark all read
                  </Button>
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
          </Tabs>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
