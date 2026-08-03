'use client'

/**
 * Route: /admin/bookings
 * Purpose: Admin booking monitoring dashboard — view all bookings across the platform.
 * Only accessible to admins. Data comes from GET /api/admin/bookings which returns
 * every booking regardless of customer or vendor.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/components/auth-provider'
import { logoutUser } from '@/lib/auth'
import { getBookings, type Booking, approveCancellation, rejectCancellation } from '@/lib/data'
import { ArrowLeft, Search, Calendar, User, Briefcase, CheckCircle2, XCircle, FileText, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const STATUS_COLORS: Record<Booking['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
  cancellation_pending: 'bg-orange-100 text-orange-800',
}

export default function AdminBookingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filtered, setFiltered] = useState<Booking[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  const handleLogout = () => {
    logoutUser()
    router.push('/login')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await getBookings()
      if (cancelled) return
      setBookings(data)
      setFiltered(data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let result = bookings
    if (statusFilter !== 'all') result = result.filter((b) => b.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.vendorBusinessName.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          b.eventType.toLowerCase().includes(q),
      )
    }
    setFiltered(result)
    setCurrentPage(1)
  }, [bookings, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginatedBookings = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleApproveCancellation = async (bookingId: string) => {
    const result = await approveCancellation(bookingId)
    if (result.success) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      toast({ title: 'Cancellation approved', description: 'Booking has been cancelled.' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  const handleRejectCancellation = async (bookingId: string) => {
    const result = await rejectCancellation(bookingId)
    if (result.success) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted', cancellationRequestedBy: undefined, cancellationReason: undefined } : b))
      toast({ title: 'Cancellation rejected', description: 'Booking restored to accepted.' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    cancellation_pending: bookings.filter((b) => b.status === 'cancellation_pending').length,
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex h-screen bg-background">
        <Sidebar userRole="admin" userName={user?.fullName || 'Admin'} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-1">Booking Monitoring</h1>
                <p className="text-muted-foreground">All bookings across the platform</p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {(Object.keys(counts) as Array<keyof typeof counts>).map((key) => (
                <Card
                  key={key}
                  className={`p-4 text-center cursor-pointer transition-colors ${statusFilter === key ? 'border-primary' : ''}`}
                  onClick={() => setStatusFilter(key)}
                >
                  <p className="text-2xl font-bold">{counts[key]}</p>
                  <p className="text-xs text-muted-foreground capitalize">{key}</p>
                </Card>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by customer, vendor, service, or event type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Bookings list */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-1/3" />
                        <div className="flex gap-4">
                          <Skeleton className="h-4 w-1/5" />
                          <Skeleton className="h-4 w-1/5" />
                          <Skeleton className="h-4 w-1/6" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No bookings found.</p>
            ) : (
              <>
              <div className="space-y-3">
                {paginatedBookings.map((booking) => (
                  <Card key={booking.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status]}`}>
                            {booking.status}
                          </span>
                          <span className="text-xs text-muted-foreground">#{booking.id.slice(-8)}</span>
                        </div>
                        <p className="font-semibold">{booking.service}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {booking.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {booking.vendorBusinessName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {booking.eventDate}
                          </span>
                        </div>
                        {booking.vendorResponseNote && (
                          <p className="text-xs text-muted-foreground italic">
                            Vendor note: {booking.vendorResponseNote}
                          </p>
                        )}
                        {booking.status === 'cancellation_pending' && (
                          <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-1">
                            <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                              Cancellation requested by: {booking.cancellationRequestedBy}
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-400">
                              Reason: {booking.cancellationReason}
                            </p>
                            {booking.vendorRefundConfirmed && (
                              <p className="text-xs text-green-700 dark:text-green-400 font-medium">✓ Vendor confirmed refund</p>
                            )}
                            {booking.cancellationProofUrl && (
                              <a href={booking.cancellationProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> View proof
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                        {booking.budget && (
                          <p className="text-sm font-medium">{booking.budget}</p>
                        )}
                        {booking.status === 'cancellation_pending' && (
                          <div className="flex flex-col gap-1.5">
                            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveCancellation(booking.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectCancellation(booking.id)}>
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} bookings
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              </div>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
