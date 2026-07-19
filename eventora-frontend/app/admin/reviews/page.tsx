'use client'

/**
 * Route: /admin/reviews
 * Purpose: Review moderation and management.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Star, 
  ArrowLeft,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getReviews, deleteReview, type Review } from '@/lib/data'

export default function AdminReviewsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRating, setFilterRating] = useState<'all' | number>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const allReviews = await getReviews()
      if (!cancelled) setReviews(allReviews)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteReview = async (reviewId: string) => {
    const result = await deleteReview(reviewId)
    if (result.success) {
      toast({
        title: 'Review Removed',
        description: 'The review has been deleted from the platform.',
      })
      setReviews(reviews.filter(r => r.id !== reviewId))
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      })
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          review.vendorId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRating = filterRating === 'all' || review.rating === filterRating
    return matchesSearch && matchesRating
  })

  const getStarDisplay = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array(5).fill(0).map((_, i) => (
          <Star 
            key={i}
            className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
        <span className="text-sm font-semibold ml-2">{rating}/5</span>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Review Management</h1>
              <p className="text-muted-foreground">Moderate vendor reviews and remove inappropriate content</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by customer or vendor name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterRating === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRating('all')}
                size="sm"
              >
                All Ratings
              </Button>
              {[5, 4, 3, 2, 1].map(rating => (
                <Button 
                  key={rating}
                  variant={filterRating === rating ? 'default' : 'outline'}
                  onClick={() => setFilterRating(rating)}
                  size="sm"
                  className="gap-1"
                >
                  {rating}★
                </Button>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No reviews found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search filters' : 'No reviews on the platform yet'}
                </p>
              </Card>
            ) : (
              filteredReviews.map(review => (
                <Card key={review.id} className="p-6 border">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {review.customerName}
                        </h3>
                        {getStarDisplay(review.rating)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Reviewing vendor ID: {review.vendorId}
                      </p>
                      <p className="text-sm text-foreground mb-4">{review.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        Posted on {new Date(review.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Stats */}
          {reviews.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Reviews</p>
                <p className="text-3xl font-bold">{reviews.length}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                <p className="text-3xl font-bold">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}/5
                </p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-1">5-Star Reviews</p>
                <p className="text-3xl font-bold">{reviews.filter(r => r.rating === 5).length}</p>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
