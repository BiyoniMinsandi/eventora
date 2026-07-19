'use client'

/**
 * Route: /vendors
 * Purpose: Browse approved vendors.
 * Category and price range are filtered by the backend; text search is applied
 * client-side on the returned set for instant feedback while typing.
 * Suspense is required because useSearchParams() must be inside a Suspense boundary
 * in Next.js App Router.
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, MapPin, Search, Filter } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading'
import type { User } from '@/lib/auth'
import { useAuth } from '@/components/auth-provider'
import { getVendors, getVendorReviews, getPublicCategories, type PublicCategory } from '@/lib/data'

export default function VendorBrowsePage() {
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [vendors, setVendors] = useState<User[]>([])
  const [reviewSummary, setReviewSummary] = useState<Record<string, { avg: number; count: number }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [locationQuery, setLocationQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dbCategories, setDbCategories] = useState<PublicCategory[]>([])

  const PRICE_BOUNDS: Record<string, { min?: number; max?: number }> = {
    all: {},
    budget: { max: 25000 },
    mid: { min: 25000, max: 100000 },
    premium: { min: 100000 },
  }

  // Re-fetch when category/price changes; also debounce text search to backend.
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const searchParam = searchParams.get('search')

    if (categoryParam) setSelectedCategory(categoryParam)
    if (searchParam) setSearchQuery(searchParam)

    const bounds = PRICE_BOUNDS[priceRange] ?? {}
    let cancelled = false

    const doFetch = async (searchTerm?: string) => {
      setIsLoading(true)
      const approvedVendors = await getVendors({
        search: searchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        location: locationQuery.trim() || undefined,
        minPrice: bounds.min,
        maxPrice: bounds.max,
      })
      if (cancelled) return
      setVendors(approvedVendors)
      setIsLoading(false)
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doFetch(searchQuery || undefined), 400)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, priceRange, selectedCategory, searchQuery, locationQuery])

  useEffect(() => {
    if (vendors.length === 0) {
      setReviewSummary({})
      return
    }

    let cancelled = false
    ;(async () => {
      const pairs = await Promise.all(
        vendors.map(async (vendor) => {
          const reviews = await getVendorReviews(vendor.id)
          const count = reviews.length
          const avg = count === 0 ? 0 : reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count
          return [vendor.id, { avg, count }] as const
        })
      )

      if (cancelled) return
      setReviewSummary(Object.fromEntries(pairs))
    })()

    return () => {
      cancelled = true
    }
  }, [vendors])

  useEffect(() => {
    getPublicCategories().then(setDbCategories).catch(() => {})
  }, [])

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...dbCategories.map((c) => ({ value: c.slug, label: c.name })),
  ]

  // Backend handles all filtering including text search; no client-side pass needed.
  const filteredVendors = vendors

  const mainContent = (
    <main className={`flex-1 overflow-y-auto ${isAuthenticated ? '' : ''}`}>
          {/* Search & Filter Section */}
          <section className="border-b border-gray-100 bg-gray-50/60 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-primary text-[10px] font-semibold tracking-[0.3em] uppercase mb-2">Discover</p>
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Browse Vendors</h1>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`gap-2 ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="City or area…"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Price Range</label>
                    <select
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                    >
                      <option value="all">All Prices</option>
                      <option value="budget">Budget Friendly</option>
                      <option value="mid">Mid Range</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory('all'); setLocationQuery(''); setPriceRange('all'); setSearchQuery('') }}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm hover:bg-muted transition"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Results Count */}
              <p className="text-sm text-muted-foreground">
                Showing {filteredVendors.length} vendors
              </p>
            </div>
          </section>

          {/* Vendors Grid */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-48 w-full rounded-none" />
                      <div className="p-5 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-9 w-full mt-2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredVendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVendors.map((vendor) => {
                    const averageRating = reviewSummary[vendor.id]?.avg ?? 0
                    const reviewCount = reviewSummary[vendor.id]?.count ?? 0
                    const firstPhoto = vendor.photos && vendor.photos.length > 0 ? vendor.photos[0] : null
                    
                    return (
                      <Card key={vendor.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100 hover:border-primary/20 rounded-2xl">
                        {/* Image */}
                        <div className="relative bg-muted h-52 w-full overflow-hidden">
                          {firstPhoto ? (
                            <Image src={firstPhoto} alt={vendor.businessName || vendor.fullName} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 to-primary/20">
                              <span className="text-6xl font-bold text-primary/20">
                                {(vendor.businessName || vendor.fullName).charAt(0)}
                              </span>
                            </div>
                          )}
                          {vendor.approved && (
                            <div className="absolute top-3 right-3 bg-white/95 text-primary px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide shadow-sm">
                              ✓ Verified
                            </div>
                          )}
                          {vendor.category && (
                            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-medium capitalize">
                              {vendor.category}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-base mb-0.5">
                            {vendor.businessName || vendor.fullName}
                          </h3>

                          {vendor.location && (
                            <div className="flex items-center gap-1 mb-3 text-xs text-gray-400">
                              <MapPin className="w-3 h-3" />
                              <span>{vendor.location}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(averageRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-100'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">
                              {averageRating > 0 ? averageRating.toFixed(1) : 'New'} {reviewCount > 0 && `(${reviewCount})`}
                            </span>
                          </div>

                          {vendor.description && (
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                              {vendor.description}
                            </p>
                          )}

                          {vendor.pricing && (
                            <p className="text-xs font-semibold text-primary mb-4">{vendor.pricing}</p>
                          )}

                          <Button asChild className="w-full rounded-xl h-9 text-sm">
                            <Link href={`/vendors/${vendor.id}`}>View Profile</Link>
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {vendors.length === 0
                      ? 'No approved vendors yet. Ask an admin to approve vendor applications.'
                      : 'No vendors match your search. Try a different term or category.'}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </section>
    </main>
  )

  return (
    <Suspense fallback={<Loading />}>
      {isAuthenticated && user ? (
        <div className="flex h-screen bg-background">
          <Sidebar userRole={user.role as 'customer' | 'vendor' | 'admin'} />
          {mainContent}
        </div>
      ) : (
        <>
          <Header />
          {mainContent}
          <Footer />
        </>
      )}
    </Suspense>
  )
}
