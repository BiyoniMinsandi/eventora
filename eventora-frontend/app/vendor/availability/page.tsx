'use client'

/**
 * Route: /vendor/availability
 * Purpose: Set availability so customers know open time slots.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { updateMeApi } from '@/lib/auth'
import { Calendar as CalendarIcon, Clock, Plus, X, ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react'
import type { AvailabilitySlot } from '@/lib/auth'

export default function VendorAvailability() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    if (user?.availability) {
      setAvailability(user.availability)
    }
  }, [user])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setShowDialog(true)
    }
  }

  const handleAddTimeSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    if (startTime >= endTime) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      })
      return
    }

    const dateStr = selectedDate.toISOString().split('T')[0]
    const existingSlot = availability.find(slot => slot.date === dateStr)

    let updatedAvailability: AvailabilitySlot[]

    if (existingSlot) {
      updatedAvailability = availability.map(slot => {
        if (slot.date === dateStr) {
          return {
            ...slot,
            timeSlots: [...slot.timeSlots, { startTime, endTime }],
          }
        }
        return slot
      })
    } else {
      updatedAvailability = [
        ...availability,
        {
          date: dateStr,
          timeSlots: [{ startTime, endTime }],
        },
      ]
    }

    setAvailability(updatedAvailability)
    setStartTime('09:00')
    setEndTime('10:00')

    toast({
      title: 'Success',
      description: `Added ${startTime} - ${endTime} on ${selectedDate.toDateString()}`,
    })
  }

  const handleRemoveSlot = (dateStr: string, slotIndex: number) => {
    const updatedAvailability = availability
      .map(slot => {
        if (slot.date === dateStr) {
          return {
            ...slot,
            timeSlots: slot.timeSlots.filter((_, idx) => idx !== slotIndex),
          }
        }
        return slot
      })
      .filter(slot => slot.timeSlots.length > 0)

    setAvailability(updatedAvailability)
    toast({
      title: 'Removed',
      description: 'Time slot removed',
    })
  }

  const handleSaveAvailability = async () => {
    if (!user) return

    // Validate time slots
    if (availability.length === 0) {
      toast({
        title: 'Info',
        description: 'Please add at least one availability slot',
        variant: 'destructive',
      })
      return
    }

    const result = await updateMeApi({ availability })

    if (result.success) {
      if (result.user) refreshUser(result.user)
      toast({
        title: 'Success',
        description: 'Availability saved successfully',
      })
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      })
    }
  }

  if (!user) return null

  // Get selected dates for highlighting in calendar
  const selectedDates = availability.map(slot => new Date(slot.date + 'T00:00:00'))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Availability</h1>
              <p className="text-muted-foreground">Set your available dates and time slots for bookings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Section */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Select Dates
                </CardTitle>
                <CardDescription>Click on a date to add time slots</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border border-border p-0"
                />
              </CardContent>
            </Card>

            {/* Time Slots Section */}
            <div className="lg:col-span-2 space-y-6">
              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Add Time Slot for {selectedDate.toDateString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Start Time</label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">End Time</label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddTimeSlot} className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Add Time Slot
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Current Availability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Current Availability
                  </CardTitle>
                  <CardDescription>
                    {availability.length === 0 ? 'No availability added yet' : `${availability.length} date(s) with time slots`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availability.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Click on a date in the calendar to add your available times
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {availability.map((slot) => (
                        <div key={slot.date} className="border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">
                              {new Date(slot.date + 'T00:00:00').toDateString()}
                            </h3>
                            <Badge variant="outline" className="gap-1">
                              {slot.timeSlots.length} slot{slot.timeSlots.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {slot.timeSlots.map((time, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-muted p-2 rounded"
                              >
                                <span className="text-sm">
                                  {time.startTime} - {time.endTime}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSlot(slot.date, idx)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              {availability.length > 0 && (
                <Button
                  onClick={handleSaveAvailability}
                  size="lg"
                  className="w-full"
                >
                  Save Availability
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
