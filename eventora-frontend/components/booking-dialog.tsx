'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createBooking } from '@/lib/data'
import type { AvailabilitySlot } from '@/lib/auth'

interface BookingDialogProps {
  vendorId: string
  vendorName: string
  vendorBusinessName: string
  vendorAvailability?: AvailabilitySlot[]
  trigger?: React.ReactNode
}

export function BookingDialog({ vendorId, vendorName, vendorBusinessName, vendorAvailability, trigger }: BookingDialogProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    service: '',
    eventDate: '',
    eventType: '',
    guestCount: '',
    budget: '',
    specialRequests: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    if (user.role !== 'customer') {
      setError('Only customers can make bookings.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await createBooking({
        customerId: user.id,
        customerName: user.fullName,
        vendorId,
        vendorName,
        vendorBusinessName,
        service: formData.service,
        eventDate: formData.eventDate,
        eventType: formData.eventType,
        guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
        budget: formData.budget,
        specialRequests: formData.specialRequests,
        status: 'pending',
        paymentStatus: 'unpaid',
        currency: 'usd',
      })

      // Notifications are created by the server as the source of truth.
      setSuccess(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }

    // Redirect after a brief success state
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
      setFormData({
        service: '',
        eventDate: '',
        eventType: '',
        guestCount: '',
        budget: '',
        specialRequests: '',
      })
      router.push('/customer/bookings')
    }, 800)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" className="gap-2">
            <Calendar className="w-5 h-5" />
            Book Now
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Booking</DialogTitle>
          <DialogDescription>
            Send a booking request to {vendorBusinessName}. They will review and respond to your request.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Booking Request Sent!</h3>
            <p className="text-sm text-muted-foreground">
              The vendor will review your request and get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            <div className="space-y-2">
              <label htmlFor="service" className="text-sm font-medium">
                Service Required *
              </label>
              <Input
                id="service"
                placeholder="Service name"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="eventDate" className="text-sm font-medium">
                  Event Date *
                </label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => {
                    const date = e.target.value
                    setFormData({ ...formData, eventDate: date })
                    if (date && vendorAvailability && vendorAvailability.length > 0) {
                      const ok = vendorAvailability.some((s) => s.date === date)
                      setAvailabilityWarning(ok ? null : "This date is outside the vendor's listed availability — your request will still be sent and the vendor will confirm.")
                    } else {
                      setAvailabilityWarning(null)
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={loading}
                />
                {availabilityWarning && (
                  <p className="text-xs text-amber-600 flex items-start gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{availabilityWarning}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="eventType" className="text-sm font-medium">
                  Event Type *
                </label>
                <Input
                  id="eventType"
                  placeholder="Event type"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="guestCount" className="text-sm font-medium">
                  Guest Count
                </label>
                <Input
                  id="guestCount"
                  type="number"
                  placeholder=""
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="budget" className="text-sm font-medium">
                  Budget Range
                </label>
                <Input
                  id="budget"
                  placeholder=""
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="specialRequests" className="text-sm font-medium">
                Special Requests
              </label>
              <Textarea
                id="specialRequests"
                placeholder="Any specific requirements or preferences..."
                rows={3}
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
