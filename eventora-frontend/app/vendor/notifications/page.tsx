'use client'

/**
 * Route: /vendor/notifications
 * Purpose: Vendor notification center.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trophy,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { logoutUser } from '@/lib/auth'
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  type Notification 
} from '@/lib/data'

export default function VendorNotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedTab, setSelectedTab] = useState<'all' | 'approval' | 'bookings'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const userNotifications = await getUserNotifications(user.id)
      if (cancelled) return
      setNotifications(userNotifications)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vendor_approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'vendor_rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'booking_accepted':
      case 'booking_rejected':
        return <MessageSquare className="w-5 h-5 text-blue-600" />
      case 'review_prompt':
        return <Trophy className="w-5 h-5 text-yellow-600" />
      default:
        return <Bell className="w-5 h-5 text-primary" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'vendor_approved':
        return 'bg-green-50 border-green-200'
      case 'vendor_rejected':
        return 'bg-red-50 border-red-200'
      case 'booking_accepted':
        return 'bg-blue-50 border-blue-200'
      case 'booking_rejected':
        return 'bg-orange-50 border-orange-200'
      case 'review_prompt':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-muted border-border'
    }
  }

  const filterNotifications = () => {
    if (selectedTab === 'all') return notifications
    if (selectedTab === 'approval') {
      return notifications.filter(n => n.type === 'vendor_approved' || n.type === 'vendor_rejected')
    }
    if (selectedTab === 'bookings') {
      return notifications.filter(n => 
        n.type === 'booking_accepted' || 
        n.type === 'booking_rejected' || 
        n.type === 'booking_completed'
      )
    }
    return notifications
  }

  const filteredNotifications = filterNotifications()

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" userName={user?.businessName || user?.fullName || 'Vendor'} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
              <p className="text-muted-foreground">Stay updated with account and booking notifications</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button 
              variant={selectedTab === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedTab('all')}
            >
              All
            </Button>
            <Button 
              variant={selectedTab === 'approval' ? 'default' : 'outline'}
              onClick={() => setSelectedTab('approval')}
            >
              Account Approval
            </Button>
            <Button 
              variant={selectedTab === 'bookings' ? 'default' : 'outline'}
              onClick={() => setSelectedTab('bookings')}
            >
              Bookings
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3 max-w-3xl">
            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading notifications...</p>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
                <p className="text-muted-foreground">You're all caught up!</p>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`p-4 border transition-colors cursor-pointer ${getNotificationColor(notification.type)} ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{notification.title}</h3>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
