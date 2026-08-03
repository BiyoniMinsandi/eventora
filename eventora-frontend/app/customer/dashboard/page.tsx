'use client'

/**
 * Route: /customer/dashboard
 * Purpose: Customer home dashboard (bookings summary + quick actions).
 */

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Star,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/components/auth-provider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBookings, getBookingStats, type Booking } from '@/lib/data'
import { logoutUser } from '@/lib/auth'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  // Clears auth and returns to login.
  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
  })

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const userBookings = await getUserBookings(user.id, 'customer')
      const bookingStats = await getBookingStats(user.id, 'customer')

      if (cancelled) return

      setBookings(userBookings.slice(0, 3)) // Latest 3 bookings
      setStats({
        total: bookingStats.accepted + bookingStats.pending,
        pending: bookingStats.pending,
        accepted: bookingStats.accepted,
        completed: bookingStats.completed,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [user])
  
  const statCards = [
    {
      label: 'Active Bookings',
      value: stats.total.toString(),
      icon: ShoppingCart,
      color: 'text-primary',
    },
    {
      label: 'Pending Requests',
      value: stats.pending.toString(),
      icon: Clock,
      color: 'text-accent',
    },
    {
      label: 'Completed Events',
      value: stats.completed.toString(),
      icon: CheckCircle2,
      color: 'text-green-600',
    },
  ]

  // Map booking status to a consistent badge color.
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200'
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="flex h-screen bg-background">
        <Sidebar userRole="customer" userName={user?.fullName || 'Customer'} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {user?.fullName || 'Customer'}! 👋
              </h1>
              <p className="text-muted-foreground">Here's what's happening with your events</p>
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
                  </Card>
                )
              })}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Bookings */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground">Recent Bookings</h2>
                    <Button variant="ghost" asChild>
                      <Link href="/customer/bookings" className="gap-2">
                        View All <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Start exploring vendors and book services for your event!
                      </p>
                      <Button asChild>
                        <Link href="/vendors">
                          <Search className="w-4 h-4 mr-2" />
                          Find a Vendor
                     
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{booking.vendorBusinessName}</h3>
                            <p className="text-sm text-muted-foreground">{booking.service}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Event: {formatDate(booking.eventDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/customer/bookings`}>Details</Link>
                            </Button>
                          </div>
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
                    <Link href="/vendors">
                      <ShoppingCart className="w-4 h-4" />
                      Browse Vendors
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2 bg-transparent">
                    <Link href="/customer/bookings">
                      <Clock className="w-4 h-4" />
                      My Bookings
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2 bg-transparent">
                    <Link href="/customer/messages">
                      <MessageCircle className="w-4 h-4" />
                      Messages
                    </Link>
                  </Button>
                </div>
              </Card>

              {/* Tips Card */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <h3 className="font-bold text-foreground mb-2">💡 Tip</h3>
                <p className="text-sm text-foreground">
                  Check vendor ratings and reviews before booking to ensure quality service for your event.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
