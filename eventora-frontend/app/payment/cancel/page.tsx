'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

function CancelContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
        <XCircle className="w-12 h-12 text-yellow-600" />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          Your payment was cancelled. Your booking is still pending payment — you can complete the payment at any time from your bookings page.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button asChild className="flex-1">
          <Link href="/customer/bookings">View My Bookings</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/vendors">Browse Vendors</Link>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
            <CancelContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
