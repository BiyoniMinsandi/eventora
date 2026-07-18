'use client'

/**
 * Route: /
 * Purpose: Public landing page + quick entry into vendor discovery.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { getPublicCategories } from '@/lib/data'
import {
  Camera,
  Users,
  Music,
  Utensils,
  Palette,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Heart,
} from 'lucide-react'

interface RecentReview {
  id: string
  customerName: string
  vendorName: string
  rating: number
  comment: string
  createdAt: string
}

const CATEGORY_ICONS: Record<string, typeof Camera> = {
  photography: Camera,
  catering: Utensils,
  decoration: Palette,
  venues: Users,
  music: Music,
}

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [reviews, setReviews] = useState<RecentReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])

  useEffect(() => {
    getPublicCategories().then(cats => setDbCategories(cats)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<RecentReview[]>('/api/reviews/recent?limit=6', { auth: false })
        if (!cancelled) setReviews(data)
      } catch {
        // silently ignore — section just stays hidden
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Convert the hero search input into a vendors listing URL.
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/vendors?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/vendors')
    }
  }

  const categories = dbCategories.length > 0
    ? dbCategories.map(c => ({
        icon: CATEGORY_ICONS[c.slug] ?? Camera,
        label: c.name,
        href: `/vendors?category=${c.slug}`,
      }))
    : [
        { icon: Camera, label: 'Photographers', href: '/vendors?category=photography' },
        { icon: Utensils, label: 'Caterers', href: '/vendors?category=catering' },
        { icon: Palette, label: 'Decorators', href: '/vendors?category=decoration' },
        { icon: Users, label: 'Venues', href: '/vendors?category=venues' },
        { icon: Music, label: 'Musicians', href: '/vendors?category=music' },
      ]

  const steps = [
    {
      number: '01',
      title: 'Search & Discover',
      description: 'Browse hundreds of verified vendors in your area',
      icon: MapPin,
    },
    {
      number: '02',
      title: 'Request Booking',
      description: 'Send booking requests directly to vendors',
      icon: MessageCircle,
    },
    {
      number: '03',
      title: 'Book & Celebrate',
      description: 'Manage bookings and communicate seamlessly',
      icon: Heart,
    },
  ]

  return (
    <>
      <Header />
      <main className="flex flex-col">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 via-accent/5 to-transparent py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance mb-6">
                Plan Your Event with <span className="text-primary">Trusted Vendors</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 text-balance">
                Connect with verified photographers, caterers, decorators, venues, musicians, and more for your perfect celebration.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Input
                  type="text"
                  placeholder="What are you looking for?"
                  className="sm:max-w-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button size="lg" className="gap-2" type="submit">
                  Search <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-sm text-muted-foreground">
                Join thousands of happy customers who found their perfect vendors
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <Link
                    key={category.label}
                    href={category.href}
                    className="group flex flex-col items-center justify-center p-6 rounded-lg border border-border hover:border-primary bg-card hover:bg-muted transition-all"
                  >
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm md:text-base font-medium text-center">{category.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How Eventora Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step) => {
                const Icon = step.icon
                return (
                  <div key={step.number} className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Eventora?</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {[
                { title: 'Verified Vendors', description: 'All vendors are carefully verified and reviewed by our team' },
                { title: 'Easy Booking', description: 'Simple and intuitive booking process that takes minutes' },
                { title: 'Secure Payments', description: 'Safe and secure payment processing with buyer protection' },
                { title: 'Customer Support', description: '24/7 support team ready to help with any questions' },
                { title: 'Ratings & Reviews', description: 'Real reviews from verified customers help you choose' },
                { title: 'Dispute Resolution', description: 'Fair and transparent dispute resolution process' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials — real reviews from the database */}
        {(reviewsLoading || reviews.length > 0) && (
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Our Customers Say</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {reviewsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-card p-6 rounded-lg border border-border space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    ))
                  : reviews.map((review) => (
                      <div key={review.id} className="bg-card p-6 rounded-lg border border-border">
                        <div className="flex gap-1 mb-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                        <p className="text-foreground mb-4 line-clamp-4">{`"${review.comment}"`}</p>
                        <div>
                          <p className="font-semibold text-sm">{review.customerName}</p>
                          <p className="text-xs text-muted-foreground">Reviewed {review.vendorName}</p>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Plan Your Event?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Register now and start exploring vendors for your special day
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/vendors">Browse Vendors</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
