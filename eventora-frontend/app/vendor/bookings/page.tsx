'use client'

/**
 * Route: /vendor/bookings
 * Purpose: View and manage vendor bookings.
 */

import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Calendar, CheckCircle2, Clock, MessageCircle, ArrowLeft, Flag } from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/components/auth-provider'
import { useEffect, useState } from 'react'
import { getUserBookings, type Booking, getOrCreateConversation, updateBookingStatus, reportCustomer } from '@/lib/data'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface ReportState {
  bookingId: string
  customerName: string
  title: string
  description: string
  category: string
  submitting: boolean
}

export default function VendorBookingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [reportDialog, setReportDialog] = useState<ReportState | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const vendorBookings = await getUserBookings(user.id, 'vendor')
      if (cancelled) return
      setBookings(vendorBookings)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings
    return bookings.filter((booking) => booking.status === status)
  }

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />
      case 'rejected':
        return <Clock className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const handleMessage = async (booking: Booking) => {
    if (!user) return
    const conversationId = await getOrCreateConversation(
      booking.customerId,
      booking.customerName || 'Customer',
      user.id,
      user.businessName || user.fullName,
      booking.id
    )
    router.push(`/vendor/messages?conversationId=${conversationId}`)
  }

  const handleMarkCompleted = async (booking: Booking) => {
    await updateBookingStatus(booking.id, 'completed')
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'completed' } : b)))
  }

  const openReportDialog = (booking: Booking) => {
    setReportDialog({
      bookingId: booking.id,
      customerName: booking.customerName || 'Customer',
      title: '',
      description: '',
      category: 'behavior',
      submitting: false,
    })
  }

  const submitReport = async () => {
    if (!reportDialog) return
    if (!reportDialog.title.trim() || !reportDialog.description.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' })
      return
    }
    setReportDialog(d => d ? { ...d, submitting: true } : d)
    const result = await reportCustomer(
      reportDialog.bookingId,
      reportDialog.title,
      reportDialog.description,
      reportDialog.category
    )
    setReportDialog(d => d ? { ...d, submitting: false } : d)
    if (result.success) {
      toast({ title: 'Report submitted', description: result.message })
      setReportDialog(null)
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
      <div className="flex h-screen bg-background">
        <Sidebar userRole="vendor" userName={user?.businessName || user?.fullName || 'Vendor'} />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">My Bookings</h1>
                <p className="text-muted-foreground">Manage your confirmed and upcoming events</p>
              </div>
            </div>

            {/* Booking Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full md:w-max grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              {['all', 'pending', 'accepted', 'completed'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-6 space-y-4">
                  {filterBookings(tab).length > 0 ? (
                    filterBookings(tab).map((booking) => (
                      <Card key={booking.id} className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg text-foreground">
                                {booking.customerName || 'Customer'}
                              </h3>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(booking.status)}
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    booking.status
                                  )}`}
                                >
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Event Type</p>
                                <p className="text-sm font-medium text-foreground">
                                  {booking.eventType}
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
                                <p className="text-xs text-muted-foreground mb-1">Details</p>
                                <p className="text-sm text-foreground line-clamp-2">
                                  {booking.specialRequests || 'No additional details'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 mt-4 md:mt-0">
                            {(booking.status === 'accepted' || booking.status === 'completed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent gap-2"
                                onClick={() => handleMessage(booking)}
                              >
                                <MessageCircle className="w-4 h-4" />
                                Message
                              </Button>
                            )}
                            {booking.status === 'accepted' && (
                              <Button size="sm" onClick={() => handleMarkCompleted(booking)}>
                                Mark Completed
                              </Button>
                            )}
                            <Button size="sm" asChild>
                              <Link href={`/vendor/bookings/${booking.id}`}>
                                View Details
                              </Link>
                            </Button>
                            {(booking.status === 'accepted' || booking.status === 'completed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => openReportDialog(booking)}
                              >
                                <Flag className="w-4 h-4" />
                                Report Customer
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No {tab !== 'all' ? tab : ''} bookings
                      </p>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
      {/* Report Customer Dialog */}
      <Dialog open={!!reportDialog} onOpenChange={open => { if (!open) setReportDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Report Customer
            </DialogTitle>
            <DialogDescription>
              {reportDialog && `Report a complaint about ${reportDialog.customerName}. An admin will review your report.`}
            </DialogDescription>
          </DialogHeader>
          {reportDialog && (
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select
                  value={reportDialog.category}
                  onChange={e => setReportDialog(d => d ? { ...d, category: e.target.value } : d)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground"
                >
                  <option value="behavior">Disruptive Behavior</option>
                  <option value="payment">Payment Issue</option>
                  <option value="damage">Property Damage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <Input
                  placeholder="Brief description of the issue"
                  value={reportDialog.title}
                  onChange={e => setReportDialog(d => d ? { ...d, title: e.target.value } : d)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Details</label>
                <textarea
                  placeholder="Describe what happened in detail..."
                  value={reportDialog.description}
                  onChange={e => setReportDialog(d => d ? { ...d, description: e.target.value } : d)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setReportDialog(null)}
                  disabled={reportDialog.submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={submitReport}
                  disabled={reportDialog.submitting}
                >
                  {reportDialog.submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
