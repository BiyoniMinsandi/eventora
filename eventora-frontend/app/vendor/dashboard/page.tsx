'use client'

/**
 * Route: /vendor/dashboard
 * Purpose: Vendor home dashboard (booking pipeline + quick links).
 */

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  FileCheck,
  ArrowRight,
  Star,
  AlertCircle,
  DollarSign,
  Eye,
  Percent,
} from 'lucide-react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/components/auth-provider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBookings, getBookingStats, type Booking } from '@/lib/data'
import { logoutUser } from '@/lib/auth'

export default function VendorDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  // Clears auth and returns to login.
  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
  })

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const vendorBookings = await getUserBookings(user.id, 'vendor')
      const bookingStats = await getBookingStats(user.id, 'vendor')
      if (cancelled) return

      setBookings(vendorBookings)
      setStats({
        pending: bookingStats.pending,
        accepted: bookingStats.accepted,
        completed: bookingStats.completed,
        cancelled: bookingStats.cancelled,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const statCards = [
    {
      label: 'Pending Requests',
      value: stats.pending.toString(),
      icon: FileCheck,
      color: 'text-primary',
      change: 'Awaiting response',
    },
    {
      label: 'Accepted Bookings',
      value: stats.accepted.toString(),
      icon: CheckCircle2,
      color: 'text-green-600',
      change: 'Active bookings',
    },
    {
      label: 'Completed Events',
      value: stats.completed.toString(),
      icon: CheckCircle2,
      color: 'text-blue-600',
      change: 'Total finished',
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Small helpers to keep render logic readable.
  const getPendingBookings = () => bookings.filter(b => b.status === 'pending')
  const getAcceptedBookings = () => bookings.filter(b => b.status === 'accepted')

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
      <div className="flex h-screen bg-background">
        <Sidebar userRole="vendor" userName={user?.businessName || user?.fullName || 'Vendor'} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {user?.businessName || user?.fullName || 'Vendor'}! 👋
              </h1>
              <p className="text-muted-foreground">Manage your bookings and grow your business</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                        <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                      </div>
                      <div className={`p-3 bg-primary/10 rounded-lg ${stat.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
                  </Card>
                )
              })}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Requests */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">Pending Booking Requests</h2>
                  <Button variant="ghost" asChild>
                    <Link href="/vendor/bookings" className="gap-2">
                      View All <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {getPendingBookings().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <FileCheck className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No pending requests</h3>
                    <p className="text-sm text-muted-foreground">
                      All your requests have been reviewed!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getPendingBookings().map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {booking.eventType} - {booking.eventDate ? 'Scheduled' : 'Pending'}
                          </h3>
                          <p className="text-sm text-muted-foreground">{booking.service}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Event: {formatDate(booking.eventDate)}</span>
                            <span>Posted: {formatDate(booking.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="default" asChild>
                            <Link href="/vendor/requests">Review</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Events */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">Upcoming Events</h2>
                  <Button variant="ghost" asChild>
                    <Link href="/vendor/bookings" className="gap-2">
                      View All <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {getAcceptedBookings().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming events</h3>
                    <p className="text-sm text-muted-foreground">
                      You don't have any accepted bookings yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getAcceptedBookings().map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{booking.eventType}</h3>
                          <p className="text-sm text-muted-foreground">{booking.service}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Event Date: {formatDate(booking.eventDate)}
                          </p>
                          {booking.guestCount && (
                            <p className="text-xs text-muted-foreground">
                              Guests: {booking.guestCount}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button asChild className="w-full justify-start gap-2">
                    <Link href="/vendor/bookings">
                      <FileCheck className="w-4 h-4" />
                      View All Bookings
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2 bg-transparent">
                    <Link href="/vendor/profile">
                      <TrendingUp className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2 bg-transparent">
                    <Link href="/vendor/messages">
                      <MessageCircle className="w-4 h-4" />
                      Messages
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2 bg-transparent">
                    <Link href="/vendor/profile">
                      <Eye className="w-4 h-4" />
                      Edit Profile &amp; Portfolio
                    </Link>
                  </Button>
                </div>
              </Card>

              {/* Stats Card */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Booking Insights</h3>
                    <p className="text-sm text-foreground">
                      <span className="font-bold">{stats.accepted}</span> active bookings
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.pending} pending requests
                    </p>
                  </div>
                </div>
              </Card>

              {/* Tip Card */}
              <Card className="p-6 bg-accent/5 border-accent/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Pro Tip</h3>
                    <p className="text-sm text-foreground">
                      Respond to requests within 24 hours to increase your visibility!
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
