'use client'

/**
 * Route: /customer/disputes
 * Purpose: Create disputes and track their status.
 * Disputes can only be raised against Accepted or Completed bookings.
 * Each booking can have at most one active (Open / In-Review) dispute at a time.
 * The message thread lets customers follow admin communications during mediation.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { getUserDisputes, createDispute, getUserBookings, getBookingById, getDisputeMessages, sendDisputeMessage, type Dispute, type Booking, type DisputeMessage, canCreateDispute } from '@/lib/data'
import { AlertTriangle, Plus, ArrowLeft, Clock, CheckCircle2, X, MessageSquare, Send } from 'lucide-react'

interface DisputeFormData {
  bookingId: string
  title: string
  description: string
  category: 'quality' | 'behavior' | 'payment' | 'schedule' | 'damage' | 'other'
  priority: 'low' | 'medium' | 'high'
}

function CustomerDisputesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTab, setSelectedTab] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  
  const [formData, setFormData] = useState<DisputeFormData>({
    bookingId: searchParams.get('bookingId') || '',
    title: '',
    description: '',
    category: 'quality',
    priority: 'medium',
  })

  useEffect(() => {
    if (!user) return

    let cancelled = false
    ;(async () => {
      const [userDisputes, userBookings] = await Promise.all([
        getUserDisputes(user.id, 'customer'),
        getUserBookings(user.id, 'customer'),
      ])
      if (cancelled) return
      setDisputes(userDisputes)
      setBookings(userBookings)

      // If bookingId is provided in URL, open dialog
      const bookingId = searchParams.get('bookingId')
      if (bookingId) setShowDialog(true)
    })()

    return () => {
      cancelled = true
    }
  }, [user, searchParams])

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      })
      return
    }

    if (!formData.bookingId || !formData.title || !formData.description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    // Validate using the backend validation function
    const validation = await canCreateDispute(user.id, formData.bookingId)
    if (!validation.can) {
      toast({
        title: 'Cannot Create Dispute',
        description: validation.message,
        variant: 'destructive',
      })
      return
    }

    const booking = await getBookingById(formData.bookingId)
    if (!booking) {
      toast({
        title: 'Error',
        description: 'Booking not found',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    const result = await createDispute({
      bookingId: formData.bookingId,
      customerId: user.id,
      customerName: user.fullName,
      vendorId: booking.vendorId,
      vendorName: booking.vendorBusinessName || booking.vendorName,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      })
      return
    }

    if (result.dispute) {
      setDisputes((prev) => [...prev, result.dispute!])
    }
    
    toast({
      title: 'Success',
      description: 'Dispute raised successfully. Admin will review it soon.',
    })

    setFormData({
      bookingId: '',
      title: '',
      description: '',
      category: 'quality',
      priority: 'medium',
    })
    setShowDialog(false)
    
    // Clear URL parameter
    router.replace('/customer/disputes')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
      case 'in-review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filterDisputes = (status: string) => {
    if (status === 'all') return disputes
    return disputes.filter(d => d.status === status)
  }

  const openMessages = async (dispute: Dispute) => {
    setSelectedDispute(dispute)
    const msgs = await getDisputeMessages(dispute.id)
    setMessages(msgs)
  }

  const handleSendMessage = async () => {
    if (!selectedDispute || !newMessage.trim()) return
    setSendingMessage(true)
    try {
      const msg = await sendDisputeMessage(selectedDispute.id, newMessage.trim())
      setMessages((prev) => [...prev, msg])
      setNewMessage('')
    } catch {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSendingMessage(false)
    }
  }

  const getAvailableBookings = () => {
    // Only show completed or accepted bookings that don't have an active dispute
    return bookings.filter(b => 
      (b.status === 'completed' || b.status === 'accepted') &&
      !disputes.some(d => d.bookingId === b.id && (d.status === 'open' || d.status === 'in-review'))
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="customer" userName={user?.fullName || 'Customer'} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-8 h-8" />
                    Disputes & Complaints
                  </h1>
                  <p className="text-muted-foreground">Manage your service disputes with vendors</p>
                </div>
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Raise Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Raise a Dispute</DialogTitle>
                    <DialogDescription>
                      Report an issue with a vendor service. Be specific and honest in your complaint.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateDispute} className="space-y-6">
                    {/* Booking Selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Select Booking <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.bookingId}
                        onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Choose a booking</option>
                        {getAvailableBookings().map(booking => (
                          <option key={booking.id} value={booking.id}>
                            {booking.vendorBusinessName || booking.vendorName} - {booking.eventType} ({booking.eventDate})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Dispute Title <span className="text-red-600">*</span>
                      </label>
                      <Input
                        placeholder="e.g., Poor service quality, Late arrival, Unprofessional behavior"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="quality">Service Quality</option>
                        <option value="behavior">Vendor Behavior</option>
                        <option value="payment">Payment Issues</option>
                        <option value="schedule">Schedule/Timing</option>
                        <option value="damage">Property Damage</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Detailed Description <span className="text-red-600">*</span>
                      </label>
                      <Textarea
                        placeholder="Describe the issue in detail. Include what happened, when it happened, and how it affected your event."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={5}
                      />
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDialog(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full md:w-max grid-cols-5">
              <TabsTrigger value="all">
                All ({disputes.length})
              </TabsTrigger>
              <TabsTrigger value="open">
                Open ({disputes.filter(d => d.status === 'open').length})
              </TabsTrigger>
              <TabsTrigger value="in-review">
                In Review ({disputes.filter(d => d.status === 'in-review').length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({disputes.filter(d => d.status === 'resolved').length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({disputes.filter(d => d.status === 'closed').length})
              </TabsTrigger>
            </TabsList>

            {['all', 'open', 'in-review', 'resolved', 'closed'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-6 space-y-4">
                {filterDisputes(tab).length > 0 ? (
                  filterDisputes(tab).map((dispute) => (
                    <Card key={dispute.id} className="overflow-hidden">
                      <div className={`h-1 bg-gradient-to-r ${dispute.priority === 'high' ? 'from-red-500 to-red-400' : dispute.priority === 'medium' ? 'from-yellow-500 to-yellow-400' : 'from-green-500 to-green-400'}`} />
                      
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{dispute.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Against: {dispute.vendorName}
                            </p>
                          </div>
                          <Badge className={getStatusColor(dispute.status)}>
                            {dispute.status.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm text-foreground mb-4 leading-relaxed">
                          {dispute.description}
                        </p>

                        <div className="flex flex-wrap gap-2 items-center mb-4">
                          <Badge variant="outline" className="capitalize">
                            {dispute.category.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(dispute.priority)}>
                            {dispute.priority.toUpperCase()} Priority
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            Opened: {new Date(dispute.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {dispute.resolution && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <p className="text-sm font-semibold text-foreground mb-2">Admin Resolution:</p>
                            <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-transparent"
                            onClick={() => openMessages(dispute)}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Messages
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {tab === 'all' 
                          ? 'No disputes found. We hope your events go smoothly!'
                          : `No ${tab} disputes`
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      {/* Dispute message thread panel */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold">{selectedDispute.title}</p>
                <p className="text-xs text-muted-foreground">Dispute messages with admin</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDispute(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation with the admin.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}
                  >
                    <p className="text-xs text-muted-foreground">{msg.senderName} ({msg.senderRole})</p>
                    <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.content}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
            {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

export default function CustomerDisputesPage() {
  // Next.js requires `useSearchParams()` to be used under a Suspense boundary.
  // Keeping the hook in the inner component avoids prerender build errors.
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-muted-foreground">
            Loading...
          </div>
        }
      >
        <CustomerDisputesContent />
      </Suspense>
    </ProtectedRoute>
  )
}
