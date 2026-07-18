'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { verifyPaymentSession, getBookingById } from '@/lib/data'
import { CheckCircle2, Loader2, XCircle, Download } from 'lucide-react'
import type { Booking } from '@/lib/data'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [amount, setAmount] = useState<{ cents: number; currency: string } | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setState('error')
      setError('No payment session found.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const result = await verifyPaymentSession(sessionId)
        if (cancelled) return
        if (result.paymentStatus === 'paid') {
          setState('success')
          setBookingId(result.bookingId)
          setAmount({ cents: result.amountInCents, currency: result.currency })
          // Fetch full booking details for the receipt
          const bk = await getBookingById(result.bookingId)
          if (!cancelled && bk) setBooking(bk)
        } else {
          setState('error')
          setError(`Payment status: ${result.paymentStatus}. Please contact support if you were charged.`)
        }
      } catch (e: any) {
        if (cancelled) return
        setState('error')
        setError(e?.message || 'Failed to verify payment.')
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

  const handleDownloadReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=900')
    if (!printWindow) return

    const paidAt = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Eventora Payment Receipt</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 24px; margin-bottom: 32px; }
          .logo { font-size: 28px; font-weight: 800; color: #6366f1; letter-spacing: -1px; }
          .title { font-size: 14px; color: #666; margin-top: 4px; }
          .badge { display: inline-block; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 6px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; margin: 16px 0; }
          .amount { font-size: 40px; font-weight: 800; color: #15803d; text-align: center; margin: 8px 0 32px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .row .label { color: #6b7280; }
          .row .value { font-weight: 600; color: #111; }
          .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Eventora</div>
          <div class="title">Payment Receipt</div>
          <div class="badge">✓ Payment Confirmed</div>
          <div class="amount">${amount ? formatAmount(amount.cents, amount.currency) : ''}</div>
        </div>

        <div class="section">
          <div class="section-title">Booking Details</div>
          <div class="row"><span class="label">Booking ID</span><span class="value">${bookingId ?? '—'}</span></div>
          <div class="row"><span class="label">Service</span><span class="value">${booking?.service ?? '—'}</span></div>
          <div class="row"><span class="label">Vendor</span><span class="value">${booking?.vendorBusinessName || booking?.vendorName || '—'}</span></div>
          <div class="row"><span class="label">Event Type</span><span class="value">${booking?.eventType ?? '—'}</span></div>
          <div class="row"><span class="label">Event Date</span><span class="value">${booking?.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="row"><span class="label">Amount Paid</span><span class="value">${amount ? formatAmount(amount.cents, amount.currency) : '—'}</span></div>
          <div class="row"><span class="label">Currency</span><span class="value">${amount?.currency.toUpperCase() ?? '—'}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">Card (Stripe)</span></div>
          <div class="row"><span class="label">Status</span><span class="value" style="color:#15803d">Paid</span></div>
          <div class="row"><span class="label">Date & Time</span><span class="value">${paidAt}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Customer</div>
          <div class="row"><span class="label">Name</span><span class="value">${booking?.customerName ?? '—'}</span></div>
        </div>

        <div class="footer">
          Thank you for using Eventora. This receipt confirms your payment was processed successfully.<br/>
          For support, contact us at support@eventora.com
        </div>

        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <h1 className="text-2xl font-bold">Verifying your payment…</h1>
        <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-700 mb-2">Payment Successful!</h1>
          {amount && (
            <p className="text-2xl font-bold text-foreground mb-1">
              {formatAmount(amount.cents, amount.currency)}
            </p>
          )}
          <p className="text-muted-foreground">
            Your booking has been confirmed. The vendor has been notified.
          </p>
          {booking && (
            <div className="mt-4 text-left bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{booking.service}</span></p>
              <p><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{booking.vendorBusinessName || booking.vendorName}</span></p>
              <p><span className="text-muted-foreground">Event Date:</span> <span className="font-medium">{new Date(booking.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleDownloadReceipt}
          >
            <Download className="w-4 h-4" />
            Download Receipt (PDF)
          </Button>

<div className="flex gap-3">
            <Button asChild className="flex-1">
              <Link href="/customer/bookings">View My Bookings</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-red-700 mb-2">Payment Issue</h1>
        <p className="text-muted-foreground">{error || 'There was a problem processing your payment.'}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button asChild className="flex-1">
          <Link href="/customer/bookings">My Bookings</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading…</p>
            </div>
          }>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
