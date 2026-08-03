'use client'

/**
 * Route: /vendor/requests
 * Purpose: Incoming pending booking requests (accept/reject + response note).
 * SRS §4.4: a response note is required for rejection and optional for acceptance.
 * Accepting a booking auto-creates the booking-linked conversation thread.
 */

import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, CheckCircle2, X, FileCheck, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getUserBookings, updateBookingStatus, type Booking, getOrCreateConversation } from '@/lib/data'
import { logoutUser } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function VendorRequestsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [requests, setRequests] = useState<Booking[]>([])
  const [selectedRequest, setSelectedRequest] = useState<Booking | null>(null)
  const [action, setAction] = useState<'accept' | 'reject' | null>(null)
  const [responseNote, setResponseNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    ;(async () => {
      const vendorBookings = await getUserBookings(user.id, 'vendor')
      if (cancelled) return
      const pendingRequests = vendorBookings.filter((b) => b.status === 'pending')
      setRequests(pendingRequests)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }

  const handleAccept = (request: Booking) => {
    setSelectedRequest(request)
    setAction('accept')
    setResponseNote('')
    setShowDialog(true)
  }

  const handleReject = (request: Booking) => {
    setSelectedRequest(request)
    setAction('reject')
    setResponseNote('')
    setShowDialog(true)
  }

  const confirmAction = async () => {
    if (!selectedRequest) return

    if (!responseNote.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a response note',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    const newStatus = action === 'accept' ? 'accepted' : 'rejected'
    await updateBookingStatus(selectedRequest.id, newStatus, responseNote)

    if (action === 'accept') {
      await getOrCreateConversation(
        selectedRequest.customerId,
        selectedRequest.customerName || 'Customer',
        user!.id,
        user!.businessName || user!.fullName,
        selectedRequest.id
      )
    }

    setIsSubmitting(false)
    setShowDialog(false)

    // Update local state
    setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id))
    setSelectedRequest(null)
    setAction(null)
    setResponseNote('')

    toast({
      title: 'Success',
      description: `Booking request has been ${action === 'accept' ? 'accepted' : 'rejected'}`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" userName={user?.businessName || user?.fullName || 'Vendor'} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Booking Requests</h1>
            <p className="text-muted-foreground">Review and respond to customer booking requests</p>
          </div>

          {requests.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <FileCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No pending requests</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any new booking requests at the moment
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="p-6 hover:shadow-md transition">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-foreground">
                          {request.customerName || 'Customer'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Unavailable date warning */}
                  {user?.blockedDates?.includes(request.eventDate) && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>You have marked <strong>{new Date(request.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong> as unavailable. Review carefully before accepting.</span>
                    </div>
                  )}

                  {/* Request Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Event Type</p>
                      <p className="text-sm font-medium text-foreground">{request.eventType || 'Event Service'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Event Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          {new Date(request.eventDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Budget</p>
                      <p className="text-sm font-bold text-primary">{request.budget || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Guest Count */}
                  {request.guestCount && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Guest Count</p>
                      <p className="text-sm font-medium text-foreground">{request.guestCount} guests</p>
                    </div>
                  )}

                  {/* Customer Message */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Customer Request</p>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                      {request.specialRequests || 'No additional details provided'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => handleAccept(request)} className="gap-2 flex-1 sm:flex-none">
                      <CheckCircle2 className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button onClick={() => handleReject(request)} variant="destructive" className="gap-2 flex-1 sm:flex-none">
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Response Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {action === 'accept' ? 'Accept Booking Request' : 'Reject Booking Request'}
                </DialogTitle>
                <DialogDescription>
                  Provide a response note for {selectedRequest?.customerName}. This will be shared with them.
                </DialogDescription>
              </DialogHeader>

              {selectedRequest && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm"><span className="font-semibold">Event:</span> {selectedRequest.eventType}</p>
                    <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(selectedRequest.eventDate).toLocaleDateString()}</p>
                    {selectedRequest.guestCount && <p className="text-sm"><span className="font-semibold">Guests:</span> {selectedRequest.guestCount}</p>}
                    <p className="text-sm"><span className="font-semibold">Budget:</span> {selectedRequest.budget || 'Not specified'}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Response Note <span className="text-red-600">*</span>
                    </label>
                    <Textarea
                      placeholder={
                        action === 'accept'
                          ? 'e.g., Confirmed! Looking forward to this event. Here are some additional details...'
                          : 'e.g., Thank you for your interest. Unfortunately, we are not available on that date. Perhaps we can reschedule?'
                      }
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmAction}
                      disabled={isSubmitting}
                      className={action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      {isSubmitting ? 'Submitting...' : (action === 'accept' ? 'Accept & Send' : 'Reject & Send')}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
