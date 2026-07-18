'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getPublicCategories } from '@/lib/data'
import {
  Camera, Users, Music, Utensils, Palette,
  Star, ArrowRight, Search, ShieldCheck, Clock, MessageCircle,
} from 'lucide-react'

interface RecentReview {
  id: string
  customerName: string
  vendorName: string
  rating: number
  comment: string
  createdAt: string
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Camera; image: string; color: string }> = {
  photography: {
    icon: Camera,
    image: 'https://images.unsplash.com/photo-1542038374576-f6f5de1fc16e?w=400&q=80',
    color: 'from-violet-900/70',
  },
  catering: {
    icon: Utensils,
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80',
    color: 'from-amber-900/70',
  },
  decoration: {
    icon: Palette,
    image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400&q=80',
    color: 'from-pink-900/70',
  },
  venues: {
    icon: Users,
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb8d28?w=400&q=80',
    color: 'from-blue-900/70',
  },
  music: {
    icon: Music,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    color: 'from-emerald-900/70',
  },
}

const GALLERY = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80',
  'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&q=80',
  'https://images.unsplash.com/photo-1519167758481-83f550bb8d28?w=600&q=80',
]

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [reviews, setReviews] = useState<RecentReview[]>([])
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])

  useEffect(() => {
    getPublicCategories().then(cats => setDbCategories(cats)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch<RecentReview[]>('/api/reviews/recent?limit=3', { auth: false })
      .then(data => { if (!cancelled) setReviews(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(searchQuery.trim() ? `/vendors?search=${encodeURIComponent(searchQuery.trim())}` : '/vendors')
  }

  const categories = dbCategories.length > 0
    ? dbCategories.map(c => ({ slug: c.slug, label: c.name, href: `/vendors?category=${c.slug}`, ...CATEGORY_CONFIG[c.slug] ?? { icon: Camera, image: GALLERY[0], color: 'from-blue-900/70' } }))
    : Object.entries(CATEGORY_CONFIG).map(([slug, cfg]) => ({
        slug, label: slug.charAt(0).toUpperCase() + slug.slice(1),
        href: `/vendors?category=${slug}`, ...cfg,
      }))

  return (
    <>
      <Header />
      <main className="flex flex-col">

        {/* ── Hero ── */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=90"
            alt="Elegant event celebration"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
            <p className="text-sm font-semibold tracking-[0.25em] uppercase text-primary/60 mb-5">
              Sri Lanka's Premier Event Marketplace
            </p>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 drop-shadow-xl">
              Your Perfect Event<br />
              <span className="text-primary/80">Starts Here</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover and book verified photographers, caterers, decorators, venues and musicians — all in one place.
            </p>

            <form onSubmit={handleSearch} className="flex gap-0 max-w-xl mx-auto mb-6 shadow-2xl rounded-xl overflow-hidden">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photographers, venues, caterers…"
                  className="w-full h-14 pl-12 pr-4 text-gray-900 bg-white text-sm focus:outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors flex items-center gap-2"
              >
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60">
              <span>✓ Verified vendors</span>
              <span>✓ Secure payments</span>
              <span>✓ Instant booking</span>
            </div>
          </div>
        </section>

        {/* ── Gallery Strip ── */}
        <section className="grid grid-cols-4 h-40 md:h-56">
          {GALLERY.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover hover:scale-105 transition-transform duration-700" unoptimized />
            </div>
          ))}
        </section>

        {/* ── Categories ── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Explore</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Browse by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map(cat => {
                const Icon = cat.icon ?? Camera
                return (
                  <Link key={cat.slug} href={cat.href} className="group relative rounded-2xl overflow-hidden aspect-[3/4] shadow-md hover:shadow-xl transition-shadow">
                    <Image src={cat.image ?? GALLERY[0]} alt={cat.label} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.color ?? 'from-blue-900/70'} to-transparent`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-5 text-white">
                      <Icon className="w-7 h-7 mb-2 opacity-90" />
                      <span className="font-semibold text-sm tracking-wide">{cat.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Simple Process</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">How It Works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n: '01', icon: Search, title: 'Search & Discover', desc: 'Browse hundreds of verified vendors across Sri Lanka filtered by category and location.' },
                { n: '02', icon: MessageCircle, title: 'Book & Confirm', desc: 'Send booking requests, chat with vendors, and confirm all details before your event.' },
                { n: '03', icon: ShieldCheck, title: 'Pay Securely', desc: 'Pay with confidence through our secure Stripe-powered payment system.' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.n} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-start">
                    <span className="text-5xl font-black text-blue-50 leading-none mb-4 select-none">{s.n}</span>
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Feature Banner ── */}
        <section className="relative py-24 overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=80"
            alt="Event decoration"
            fill
            className="object-cover object-center"
            unoptimized
          />
          <div className="absolute inset-0 bg-blue-900/80" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything For Your Special Day</h2>
            <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">
              From intimate gatherings to grand celebrations — Eventora connects you with the best event professionals in Sri Lanka.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {[
                { icon: ShieldCheck, label: 'Verified Vendors' },
                { icon: Clock, label: 'Fast Booking' },
                { icon: MessageCircle, label: 'Direct Chat' },
                { icon: Star, label: 'Trusted Reviews' },
              ].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.label} className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary/60" />
                    </div>
                    <span className="text-sm font-medium text-white/80">{f.label}</span>
                  </div>
                )
              })}
            </div>
            <Button size="lg" asChild className="bg-white text-primary hover:bg-primary/5 font-semibold px-8">
              <Link href="/vendors">Explore Vendors <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </section>

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-14">
                <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">Testimonials</p>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">What Our Customers Say</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
                    <div className="flex gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-6 flex-1 line-clamp-4">"{r.comment}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {r.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.customerName}</p>
                        <p className="text-xs text-gray-400">Reviewed {r.vendorName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">Ready to Plan Your Event?</h2>
            <p className="text-gray-500 text-lg mb-10">Join thousands of happy customers who made their celebrations unforgettable.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-white px-10 h-12 text-base font-semibold">
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-gray-300 text-gray-700 hover:bg-gray-100 px-10 h-12 text-base">
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
