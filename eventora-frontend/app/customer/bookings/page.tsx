'use client'

/**
 * Route: /customer/bookings
 * Purpose: Customer booking list + related actions (messages/reviews/disputes).
 */

import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, MessageCircle, AlertTriangle, CheckCircle2, Clock, X, Star, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  getUserBookings,
  type Booking,
  getOrCreateConversation,
  getDisputeByBookingId,
  getReviewByBookingId,
  createCheckoutSession,
} from '@/lib/data'
import { logoutUser } from '@/lib/auth'
import { ReviewDialog } from '@/components/review-dialog'
import { CreditCard, Loader2 } from 'lucide-react'

export default function CustomerBookingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [hasActiveDisputeByBookingId, setHasActiveDisputeByBookingId] = useState<Record<string, boolean>>({})
  const [hasReviewByBookingId, setHasReviewByBookingId] = useState<Record<string, boolean>>({})
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null)
  const [amountDialog, setAmountDialog] = useState<{ booking: Booking } | null>(null)
  const [enteredAmount, setEnteredAmount] = useState('')

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const userBookings = await getUserBookings(user.id, 'customer')
      if (cancelled) return

      setBookings(userBookings)

      const disputeEntries = await Promise.all(
        userBookings.map(async (b) => {
          const dispute = await getDisputeByBookingId(b.id)
          const active = !!dispute && (dispute.status === 'open' || dispute.status === 'in-review')
          return [b.id, active] as const
        })
      )

      const reviewEntries = await Promise.all(
        userBookings.map(async (b) => {
          const review = await getReviewByBookingId(b.id)
          return [b.id, !!review] as const
        })
      )

      if (cancelled) return

      setHasActiveDisputeByBookingId(Object.fromEntries(disputeEntries))
      setHasReviewByBookingId(Object.fromEntries(reviewEntries))
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }

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

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings
    return bookings.filter((booking) => booking.status === status)
  }

  const handleMessage = async (booking: Booking) => {
    if (!user) return
    const conversationId = await getOrCreateConversation(
      user.id,
      user.fullName,
      booking.vendorId,
      booking.vendorBusinessName || booking.vendorName
    )
    router.push(`/customer/messages?conversationId=${conversationId}`)
  }

  const handleRaiseDispute = (booking: Booking) => {
    router.push(`/customer/disputes?bookingId=${booking.id}`)
  }

  const handlePayNow = async (booking: Booking) => {
    if (!booking.amountInCents || booking.amountInCents <= 0) {
      setEnteredAmount('')
      setAmountDialog({ booking })
      return
    }
    await initiateCheckout(booking.id, booking.amountInCents)
  }

  const initiateCheckout = async (bookingId: string, amountInCents: number) => {
    try {
      setPayingBookingId(bookingId)
      const { checkoutUrl } = await createCheckoutSession(bookingId, amountInCents)
      window.location.href = checkoutUrl
    } catch (e: any) {
      alert(e?.message || 'Failed to initiate payment. Please try again.')
      setPayingBookingId(null)
    }
  }

  const handleAmountConfirm = async () => {
    if (!amountDialog) return
    const amount = parseFloat(enteredAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0.')
      return
    }
    const amountInCents = Math.round(amount * 100)
    setAmountDialog(null)
    await initiateCheckout(amountDialog.booking.id, amountInCents)
  }

  const handleReviewSubmitted = () => {
    // Refresh bookings to reflect review status
    if (!user) return
    ;(async () => {
      const userBookings = await getUserBookings(user.id, 'customer')
      setBookings(userBookings)
      const reviewEntries = await Promise.all(
        userBookings.map(async (b) => {
          const review = await getReviewByBookingId(b.id)
          return [b.id, !!review] as const
        })
      )
      setHasReviewByBookingId(Object.fromEntries(reviewEntries))
    })()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="customer" userName={user?.fullName || 'Customer'} onLogout={handleLogout} />

      {/* Amount entry dialog */}
      {amountDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Enter Payment Amount</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The vendor has not set a price yet. Enter the agreed amount to proceed.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-muted-foreground">USD $</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 150.00"
                value={enteredAmount}
                onChange={(e) => setEnteredAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAmountDialog(null)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAmountConfirm}>
                Proceed to Pay
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">My Bookings</h1>
              <p className="text-muted-foreground">Manage all your event bookings</p>
            </div>
          </div>

          {/* Booking Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full md:w-max grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'accepted', 'completed', 'rejected'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-6 space-y-4">
                {filterBookings(tab).length > 0 ? (
                  filterBookings(tab).map((booking) => {
                    const hasDispute = !!hasActiveDisputeByBookingId[booking.id]
                    const hasReview = !!hasReviewByBookingId[booking.id]
                    return (
                      <Card key={booking.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-foreground text-lg">
                                {booking.vendorName || 'Unknown Vendor'}
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
                              {hasDispute && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Dispute Active
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Service</p>
                                <p className="text-sm font-medium text-foreground">
                                  {booking.service || 'Event Service'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Event Date</p>
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(booking.eventDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Event Type</p>
                                <p className="text-sm font-medium text-foreground">
                                  {booking.eventType || 'Event'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button size="sm" asChild>
                              <Link href={`/customer/bookings/${booking.id}`}>
                                View Details
                              </Link>
                            </Button>
                            {booking.status === 'accepted' && booking.paymentStatus !== 'paid' && (
                              <Button
                                size="sm"
                                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handlePayNow(booking)}
                                disabled={payingBookingId === booking.id}
                              >
                                {payingBookingId === booking.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CreditCard className="w-4 h-4" />
                                )}
                                {payingBookingId === booking.id ? 'Redirecting…' : 'Pay Now'}
                              </Button>
                            )}
                            {booking.status === 'accepted' && booking.paymentStatus === 'paid' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 text-center">
                                ✓ Paid
                              </span>
                            )}
                            {(booking.status === 'accepted' || booking.status === 'completed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 bg-transparent"
                                onClick={() => handleMessage(booking)}
                              >
                                <MessageCircle className="w-4 h-4" />
                                Message
                              </Button>
                            )}
                            {booking.status === 'completed' && !hasReview && (
                              <ReviewDialog
                                bookingId={booking.id}
                                vendorId={booking.vendorId}
                                vendorName={booking.vendorBusinessName || booking.vendorName}
                                customerId={user!.id}
                                customerName={user!.fullName}
                                onReviewSubmitted={handleReviewSubmitted}
                              />
                            )}
                            {(booking.status === 'completed' || booking.status === 'accepted') && !hasDispute && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRaiseDispute(booking)}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Raise Dispute
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No {tab !== 'all' ? tab : ''} bookings
                    </p>
                    <Button asChild>
                      <Link href="/vendors">Browse Vendors</Link>
                    </Button>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  )
}

