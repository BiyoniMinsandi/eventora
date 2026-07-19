'use client'

/**
 * Route: /vendor/availability
 * Purpose: Mark days the vendor is NOT available for bookings.
 * Customers still send requests on any date; blocked dates show a warning.
 * When a vendor accepts a booking they confirm availability at that point.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { updateMeApi } from '@/lib/auth'
import { CalendarOff, ArrowLeft, Save, Info, X } from 'lucide-react'

export default function VendorAvailability() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // blockedDates stored as Date[] for the calendar, persisted as YYYY-MM-DD strings
  const [blockedDates, setBlockedDates] = useState<Date[]>([])

  useEffect(() => {
    if (user?.blockedDates) {
      setBlockedDates(user.blockedDates.map(d => new Date(d + 'T00:00:00')))
    }
  }, [user])

  const toDateString = (d: Date) => d.toISOString().split('T')[0]

  const handleSelect = (dates: Date[] | undefined) => {
    setBlockedDates(dates || [])
  }

  const removeDate = (idx: number) => {
    setBlockedDates(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const blockedStrings = blockedDates.map(toDateString).sort()
    const result = await updateMeApi({ blockedDates: blockedStrings })
    setSaving(false)
    if (result.success) {
      if (result.user) refreshUser(result.user)
      toast({ title: 'Saved', description: 'Your unavailable dates have been updated.' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  if (!user) return null

  const sorted = [...blockedDates].sort((a, b) => a.getTime() - b.getTime())

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Not Available Days</h1>
              <p className="text-muted-foreground">Mark days you cannot take bookings</p>
            </div>
          </div>

          {/* Info banner */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-0.5">How this works</p>
                  <p className="text-muted-foreground">
                    Click dates on the calendar to mark them as unavailable (shown in blue). Customers booking on those dates will see a warning but can still send a request. When a customer books you, you accept or reject it yourself — no need to pre-set time slots.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="w-5 h-5 text-primary" />
                  Select Unavailable Days
                </CardTitle>
                <CardDescription>Click any date to mark/unmark it as unavailable</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="multiple"
                  selected={blockedDates}
                  onSelect={handleSelect}
                  disabled={{ before: new Date() }}
                  className="rounded-md border border-border p-0"
                />
              </CardContent>
            </Card>

            {/* Blocked dates list + save */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Unavailable Dates</CardTitle>
                  <CardDescription>
                    {sorted.length === 0
                      ? 'No dates blocked — you appear available on all days'
                      : `${sorted.length} date${sorted.length !== 1 ? 's' : ''} marked as unavailable`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sorted.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Click dates on the calendar to block them.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {sorted.map((d, idx) => (
                        <div
                          key={toDateString(d)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <button
                            onClick={() => removeDate(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Unavailable Days'}
              </Button>

              {blockedDates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent text-muted-foreground"
                  onClick={() => setBlockedDates([])}
                >
                  Clear all blocked dates
                </Button>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
