'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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

const CATEGORY_CONFIG: Record<string, { icon: typeof Camera; image: string }> = {
  photography: { icon: Camera, image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=85' },
  catering:    { icon: Utensils, image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=85' },
  decoration:  { icon: Palette, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=85' },
  venues:      { icon: Users, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb8d28?w=600&q=85' },
  music:       { icon: Music, image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=85' },
}

const GALLERY = [
  { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85', label: 'Weddings' },
  { src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=85', label: 'Celebrations' },
  { src: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=85', label: 'Decor' },
  { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=85', label: 'Venues' },
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

  const categories = (dbCategories.length > 0
    ? dbCategories
    : Object.keys(CATEGORY_CONFIG).map(slug => ({ slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) }))
  ).map(c => ({
    slug: c.slug, label: c.name, href: `/vendors?category=${c.slug}`,
    ...(CATEGORY_CONFIG[c.slug] ?? { icon: Camera, image: GALLERY[0].src }),
  }))

  return (
    <>
      <Header />
      <main className="flex flex-col">

        {/* Hero */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          <Image src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=90" alt="Elegant wedding" fill className="object-cover object-center" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/40 mb-6">Sri Lanka&apos;s Premier Event Marketplace</p>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6" style={{fontFamily:'var(--font-heading)'}}>
              Your Perfect Event<br /><span className="italic">Starts Here</span>
            </h1>
            <p className="text-base md:text-lg text-white/60 mb-10 max-w-xl mx-auto leading-relaxed font-light">
              Discover and book verified photographers, caterers, decorators, venues and musicians.
            </p>
            <form onSubmit={handleSearch} className="flex max-w-lg mx-auto mb-8 rounded-xl overflow-hidden shadow-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search photographers, venues, caterers..." className="w-full h-14 pl-11 pr-4 text-gray-900 bg-white text-sm focus:outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <button type="submit" className="px-7 bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors whitespace-nowrap flex items-center gap-2">
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <div className="flex flex-wrap justify-center gap-6 text-[10px] text-white/35 tracking-widest uppercase">
              <span>Verified Vendors</span><span>Secure Payments</span><span>Instant Booking</span>
            </div>
          </div>
        </section>

        {/* Gallery Strip */}
        <section className="grid grid-cols-4 h-44 md:h-64">
          {GALLERY.map((g, i) => (
            <div key={i} className="relative overflow-hidden group cursor-pointer">
              <Image src={g.src} alt={g.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition-colors duration-300" />
              <span className="absolute inset-0 flex items-end justify-center pb-4 text-white text-[10px] font-semibold tracking-[0.25em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">{g.label}</span>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-primary text-[10px] font-semibold tracking-[0.3em] uppercase mb-4">Services</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" style={{fontFamily:'var(--font-heading)'}}>Browse by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              {categories.map(cat => {
                const Icon = cat.icon ?? Camera
                return (
                  <Link key={cat.slug} href={cat.href} className="group relative rounded-2xl overflow-hidden cursor-pointer" style={{aspectRatio:'3/4',boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}>
                    <Image src={cat.image} alt={cat.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-500" />
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 text-white">
                      <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:border-primary group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm tracking-wide">{cat.label}</span>
                      <span className="text-[10px] text-transparent group-hover:text-white/60 mt-1 tracking-wider uppercase transition-colors duration-300">Explore</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-primary text-[10px] font-semibold tracking-[0.3em] uppercase mb-4">Process</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" style={{fontFamily:'var(--font-heading)'}}>How It Works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: '01', icon: Search, title: 'Search & Discover', desc: 'Browse verified vendors across Sri Lanka, filtered by category, location and budget.' },
                { n: '02', icon: MessageCircle, title: 'Book & Confirm', desc: 'Send requests, chat directly with vendors, and confirm every detail before your event.' },
                { n: '03', icon: ShieldCheck, title: 'Pay Securely', desc: 'Complete payment through Stripe-powered checkout with full buyer protection.' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.n} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group">
                    <span className="text-7xl font-bold leading-none block mb-3 transition-colors" style={{fontFamily:'var(--font-heading)',color:'rgba(37,99,235,0.07)'}}>{s.n}</span>
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2" style={{fontFamily:'var(--font-heading)'}}>{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Feature Banner */}
        <section className="relative py-28 overflow-hidden">
          <Image src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1920&q=85" alt="Event" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-primary/88" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40 mb-4">Why Eventora</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{fontFamily:'var(--font-heading)'}}>Everything For Your Special Day</h2>
            <p className="text-white/60 text-base mb-12 max-w-xl mx-auto font-light">From intimate gatherings to grand celebrations, we connect you with the best event professionals.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { icon: ShieldCheck, label: 'Verified Vendors', sub: 'Admin approved' },
                { icon: Clock, label: 'Fast Booking', sub: 'Instant requests' },
                { icon: MessageCircle, label: 'Direct Chat', sub: 'Real-time messaging' },
                { icon: Star, label: 'Trusted Reviews', sub: 'Genuine ratings' },
              ].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.label} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 transition-colors">
                    <Icon className="w-5 h-5 text-white/70" />
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <p className="text-[11px] text-white/40">{f.sub}</p>
                  </div>
                )
              })}
            </div>
            <Link href="/vendors" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary font-semibold text-sm rounded-xl hover:bg-white/90 transition-colors shadow-lg">
              Explore All Vendors <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-14">
                <p className="text-primary text-[10px] font-semibold tracking-[0.3em] uppercase mb-4">Testimonials</p>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900" style={{fontFamily:'var(--font-heading)'}}>What Our Customers Say</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all duration-300 flex flex-col">
                    <div className="flex gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-100'}`} />
                      ))}
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1 line-clamp-4 italic">&ldquo;{r.comment}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                      <div className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{r.customerName.charAt(0).toUpperCase()}</div>
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

        {/* CTA */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5" style={{fontFamily:'var(--font-heading)'}}>Ready to Plan Your Event?</h2>
            <p className="text-gray-400 mb-10 leading-relaxed">Join thousands of happy customers who made their celebrations unforgettable.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl transition-colors shadow-md">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/vendors" className="inline-flex items-center justify-center px-8 py-3.5 border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm rounded-xl transition-colors">
                Browse Vendors
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
