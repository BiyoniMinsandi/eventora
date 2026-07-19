'use client'

/**
 * Route: /vendors/[id]
 * Purpose: Public vendor profile page (reads vendor + reviews from local storage).
 */

import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, MapPin, Phone, Mail, ArrowLeft, AlertCircle, Pencil } from 'lucide-react'
import { BookingDialog } from '@/components/booking-dialog'
import { getVendorById, getVendors, getVendorReviews } from '@/lib/data'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { User } from '@/lib/auth'
import { useAuth } from '@/components/auth-provider'

const CATEGORY_FALLBACKS: Record<string, string> = {
  photography: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1600&q=85',
  catering:    'https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&q=85',
  decoration:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85',
  venues:      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1600&q=85',
  music:       'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=85',
}
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=85'

export default function VendorProfilePage() {
  const params = useParams()
  const { user: authUser } = useAuth()
  const [vendor, setVendor] = useState<User | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const normalizeSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const isApprovedVendor = (candidate: User) =>
    candidate.role === 'vendor' &&
    (candidate.approved === true || Boolean(candidate.approvedAt))

  useEffect(() => {
    const paramId = decodeURIComponent((params.id as string) ?? '')

    let cancelled = false
    ;(async () => {
      try {
        const direct = await getVendorById(paramId)
        // Allow vendor to preview their own profile even if not yet approved
        const isOwner = authUser?.id === direct?.id
        if (!cancelled) setVendor(direct && (isApprovedVendor(direct) || isOwner) ? direct : null)
      } catch {
        const allVendors = await getVendors()
        const found = allVendors.find(
          (u) =>
            isApprovedVendor(u) &&
            normalizeSlug(u.businessName || u.fullName) === normalizeSlug(paramId)
        )
        if (!cancelled) setVendor(found || null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params.id, authUser?.id])

  useEffect(() => {
    if (!vendor?.id) {
      setReviews([])
      setAvgRating(0)
      return
    }

    let cancelled = false
    ;(async () => {
      const vendorReviews = await getVendorReviews(vendor.id)
      if (cancelled) return
      setReviews(vendorReviews)
      const count = vendorReviews.length
      const avg = count === 0 ? 0 : vendorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count
      setAvgRating(avg)
    })()

    return () => {
      cancelled = true
    }
  }, [vendor?.id])

  if (!vendor && !isLoading) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Vendor not found</h1>
            <p className="text-muted-foreground mb-4">This vendor is unavailable or not approved yet.</p>
            <Button asChild>
              <Link href="/vendors">Back to vendors</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!vendor) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-muted-foreground">Loading vendor profile...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const isOwnProfile = authUser?.id === vendor.id && authUser?.role === 'vendor'

  const services = (vendor.services || []).map((service, idx) => ({
    id: `${vendor.id}-${idx}`,
    name: service.split(':')[0] || service,
    price: service.split(':')[1] || '',
  }))

  const galleryPhotos = vendor.photos || []
  const galleryVideos = vendor.videos || []

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Vendor preview banner — only visible to the vendor themselves */}
        {isOwnProfile && (
          <div className="bg-primary text-primary-foreground px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <p className="text-sm font-medium">
                {vendor.approved
                  ? 'This is how customers see your profile.'
                  : 'Preview mode — your profile is pending admin approval and not yet public.'}
              </p>
              <Button size="sm" variant="secondary" asChild className="gap-2 shrink-0">
                <Link href="/vendor/profile">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="border-b border-border sticky top-16 z-40 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button variant="ghost" asChild className="gap-2">
              <Link href={isOwnProfile ? '/vendor/dashboard' : '/vendors'}>
                <ArrowLeft className="w-4 h-4" />
                {isOwnProfile ? 'Back to Dashboard' : 'Back to Vendors'}
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative w-full h-64 md:h-80 overflow-hidden bg-muted">
          <Image
            src={
              (vendor.photos && vendor.photos.length > 0)
                ? vendor.photos[0]
                : (CATEGORY_FALLBACKS[vendor.category?.toLowerCase() || ''] ?? DEFAULT_HERO)
            }
            alt={vendor.businessName || vendor.fullName}
            fill
            className="object-cover object-center"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          {vendor.approved && (
            <div className="absolute top-4 right-4 bg-white/95 text-primary px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm">
              ✓ Verified Vendor
            </div>
          )}
          <div className="absolute bottom-6 left-6 md:left-10">
            <p className="text-white/60 text-[10px] font-semibold tracking-[0.3em] uppercase mb-2 capitalize">
              {vendor.category || 'Vendor'}
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-md">
              {vendor.businessName || vendor.fullName}
            </h1>
          </div>
        </section>

        {/* Profile Header */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                {/* Rating & Location */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(avgRating || 0)
                              ? 'fill-accent text-accent'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-medium">{avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}</span>
                    <span className="text-muted-foreground">({reviews.length} reviews)</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {vendor.location || 'Location not provided'}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                      {vendor.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="text-primary hover:underline">
                        {vendor.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Phone not provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <BookingDialog
                vendorId={vendor.id}
                vendorName={vendor.businessName || vendor.fullName}
                vendorBusinessName={vendor.businessName || vendor.fullName}
                vendorAvailability={vendor.availability}
              />
            </div>
          </div>
        </section>

        {/* Availability */}
        <section className="bg-green-50 border-b border-green-200 p-4 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Available for bookings</p>
              <p className="text-sm text-green-800">The vendor will confirm availability after your request.</p>
            </div>
          </div>
        </section>

        {/* Tabs Content */}
        <section className="pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full md:w-max grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-4">About</h3>
                  <p className="text-foreground leading-relaxed mb-4">{vendor.description || 'No description provided yet.'}</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Experience</h4>
                      <p className="text-muted-foreground">{vendor.experience}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Location</h4>
                      <p className="text-muted-foreground">{vendor.location || 'Location not provided'}</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-6">
                <div className="space-y-4">
                  {services.length === 0 && (
                    <Card className="p-6">
                      <p className="text-muted-foreground">No services listed yet.</p>
                    </Card>
                  )}
                  {services.map((service) => (
                    <Card key={service.id} className="p-6 flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                      </div>
                      {service.price && <p className="font-bold text-primary">{service.price}</p>}
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="mt-6">
                {galleryPhotos.length === 0 && galleryVideos.length === 0 ? (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No gallery media yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {galleryPhotos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Photos</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {galleryPhotos.map((photo, index) => (
                            <div
                              key={`${vendor.id}-photo-${index}`}
                              className="relative bg-muted rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                              style={{aspectRatio:'4/3'}}
                            >
                              <Image
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {galleryVideos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Videos</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {galleryVideos.map((videoUrl, index) => (
                            <div
                              key={`${vendor.id}-video-${index}`}
                              className="relative rounded-xl overflow-hidden border border-border bg-black"
                              style={{aspectRatio:'16/9'}}
                            >
                              <video
                                src={videoUrl}
                                controls
                                preload="metadata"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <Card className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Star className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No reviews yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Be the first to leave a review after booking this vendor!
                      </p>
                    </Card>
                  ) : (
                    reviews.map((review) => (
                      <Card key={review.id} className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-foreground">{review.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-accent text-accent'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-foreground">{review.comment}</p>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
