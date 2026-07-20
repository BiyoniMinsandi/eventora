'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Users, Zap, Shield, Award } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface PlatformStats {
  customers: number
  approvedVendors: number
  totalBookings: number
  completedBookings: number
  reviews: number
  averageRating: number
}

export default function AboutPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    apiFetch<PlatformStats>('/api/stats', { auth: false })
      .then(setStats)
      .catch(() => {})
  }, [])

  const values = [
    {
      icon: Users,
      title: 'Community First',
      description: 'Eventora exists to serve the events community — connecting talented vendors with customers who deserve trusted, transparent choices.',
    },
    {
      icon: Shield,
      title: 'Trust & Transparency',
      description: 'Every vendor is manually reviewed before going live. Reviews come only from verified customers with completed bookings. No fake listings and no paid rankings.',
    },
    {
      icon: Zap,
      title: 'Simple & Fast',
      description: 'Browse, compare, and book in minutes. No phone calls or back-and-forth emails. Everything happens in one place.',
    },
    {
      icon: Award,
      title: 'Quality Over Quantity',
      description: 'We would rather have 50 exceptional vendors than 500 mediocre ones. Our approval process ensures every listing reflects genuine skill and professionalism.',
    },
  ]

  const statCards = stats
    ? [
        { value: stats.customers.toString(), label: 'Registered Customers' },
        { value: stats.approvedVendors.toString(), label: 'Verified Vendors' },
        { value: stats.completedBookings.toString(), label: 'Completed Events' },
        { value: stats.averageRating > 0 ? `${stats.averageRating}★` : '—', label: 'Average Vendor Rating' },
      ]
    : null

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28 border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-primary text-[10px] font-semibold tracking-[0.3em] uppercase mb-5">Our Story</p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">About Eventora</h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              A modern event vendor marketplace built to make planning your perfect event simple, transparent, and stress-free.
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Eventora was built to solve a simple but frustrating problem: finding reliable vendors for weddings, parties, and corporate events was slow, scattered, and stressful.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We built a single platform where customers can browse verified vendors, compare services and prices, read genuine reviews, and book with confidence. Talented vendors get a professional digital storefront and a direct line to customers actively planning events.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {statCards
                  ? statCards.map((s) => (
                      <Card key={s.label} className="p-6 text-center">
                        <div className="text-3xl font-bold text-primary mb-2">{s.value}</div>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                      </Card>
                    ))
                  : Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="p-6 text-center space-y-2">
                        <Skeleton className="h-8 w-16 mx-auto" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </Card>
                    ))}
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
              <p className="text-lg text-muted-foreground">These principles shape every decision we make.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value) => {
                const Icon = value.icon
                return (
                  <Card key={value.title} className="p-6">
                    <Icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section className="py-16 md:py-24 bg-primary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">Why Choose Eventora</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Vetted Vendors Only', desc: 'Every vendor is reviewed and approved by our admin team before appearing on the platform.' },
                { title: 'Genuine Reviews', desc: 'Reviews can only be submitted after a completed booking. No fake ratings.' },
                { title: 'Real-Time Messaging', desc: 'Chat directly with your vendor once a booking is confirmed. Messages are delivered instantly.' },
                { title: 'Dispute Resolution', desc: 'Our admin team mediates disputes fairly if any issue arises between customers and vendors.' },
                { title: 'Transparent Pricing', desc: 'Every vendor lists their price ranges upfront. No hidden fees from the platform.' },
                { title: 'Secure Payments', desc: 'Stripe-powered checkout with full buyer protection on every booking.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Ready to Plan Your Event?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Browse our verified vendors and book your perfect event team today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg"><Link href="/vendors">Browse Vendors</Link></Button>
              <Button variant="outline" asChild size="lg" className="bg-transparent"><Link href="/register">Become a Vendor</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
