'use client'

/**
 * Route: /vendor/analytics
 * Purpose: Vendor analytics derived from real booking and review data.
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { TrendingUp, Calendar, Download, Filter, ArrowLeft, Star } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { getUserBookings, getVendorReviews, type Booking, type Review } from '@/lib/data'

type Range = '30d' | '3m' | '6m' | 'all'

const BLUE_SHADES = [
  'hsl(var(--primary))',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#bfdbfe',
]

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en', { month: 'short', year: '2-digit' })
}

function filterByRange<T extends { createdAt: string }>(items: T[], range: Range): T[] {
  if (range === 'all') return items
  const now = new Date()
  const cutoff = new Date(now)
  if (range === '30d') cutoff.setDate(now.getDate() - 30)
  else if (range === '3m') cutoff.setMonth(now.getMonth() - 3)
  else if (range === '6m') cutoff.setMonth(now.getMonth() - 6)
  return items.filter(i => new Date(i.createdAt) >= cutoff)
}

function bookingsToCSV(bookings: Booking[]): string {
  const header = 'ID,Customer,Service,Event Date,Status,Payment,Amount'
  const rows = bookings.map(b =>
    [b.id, b.customerName, b.service, b.eventDate, b.status, b.paymentStatus,
      b.amountInCents != null ? (b.amountInCents / 100).toFixed(2) : ''].join(',')
  )
  return [header, ...rows].join('\n')
}

export default function VendorAnalytics() {
  const router = useRouter()
  const { user } = useAuth()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('6m')
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getUserBookings(user.id, 'vendor'),
      getVendorReviews(user.id),
    ]).then(([b, r]) => {
      setBookings(b)
      setReviews(r)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const filtered = useMemo(() => filterByRange(bookings, range), [bookings, range])
  const filteredReviews = useMemo(() => filterByRange(reviews, range), [reviews, range])

  const totalBookings = filtered.length
  const completedBookings = filtered.filter(b => b.status === 'completed').length
  const revenue = filtered
    .filter(b => b.paymentStatus === 'paid' && b.amountInCents != null)
    .reduce((sum, b) => sum + (b.amountInCents! / 100), 0)
  const avgRating = filteredReviews.length
    ? filteredReviews.reduce((s, r) => s + r.rating, 0) / filteredReviews.length
    : 0

  // Group bookings by month for bar chart (last N months in range)
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; bookings: number; revenue: number }> = {}
    filtered.forEach(b => {
      const key = getMonthKey(new Date(b.createdAt))
      if (!map[key]) map[key] = { month: monthLabel(key), bookings: 0, revenue: 0 }
      map[key].bookings++
      if (b.paymentStatus === 'paid' && b.amountInCents) {
        map[key].revenue += b.amountInCents / 100
      }
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [filtered])

  // Booking status breakdown for pie chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(b => {
      counts[b.status] = (counts[b.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [filtered])

  const handleExport = () => {
    const csv = bookingsToCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const rangeLabel: Record<Range, string> = {
    '30d': 'Last 30 days',
    '3m': 'Last 3 months',
    '6m': 'Last 6 months',
    'all': 'All time',
  }

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
                <p className="text-muted-foreground">Track your business performance</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className={`gap-2 bg-transparent ${showFilter ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
                onClick={() => setShowFilter(f => !f)}
              >
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={handleExport}
                disabled={filtered.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <Card className="p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Date range:</span>
                {(['30d', '3m', '6m', 'all'] as Range[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      range === r
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {rangeLabel[r]}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Active range label */}
          <Card className="p-4 mb-6 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{rangeLabel[range]}</span>
              <span className="text-muted-foreground">&middot; {totalBookings} booking{totalBookings !== 1 ? 's' : ''}</span>
            </div>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
              <p className="text-3xl font-bold text-primary">
                {loading ? '—' : totalBookings}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {completedBookings} completed
              </p>
            </Card>
            <Card className="p-6 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-2">Revenue (paid)</p>
              <p className="text-3xl font-bold text-primary">
                {loading ? '—' : revenue > 0 ? `Rs. ${revenue.toLocaleString()}` : 'Rs. 0'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">From completed payments</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-2">Average Rating</p>
              <p className="text-3xl font-bold text-primary flex items-center gap-2">
                {loading ? '—' : filteredReviews.length > 0 ? avgRating.toFixed(1) : 'N/A'}
                {!loading && filteredReviews.length > 0 && (
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
              </p>
            </Card>
            <Card className="p-6 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-2">Completion Rate</p>
              <p className="text-3xl font-bold text-primary">
                {loading || totalBookings === 0
                  ? '—'
                  : `${Math.round((completedBookings / totalBookings) * 100)}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Completed vs total</p>
            </Card>
          </div>

          {/* Charts */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading analytics...
            </div>
          ) : monthlyData.length === 0 && statusData.length === 0 ? (
            <Card className="p-12 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No booking data yet for this period.</p>
              <p className="text-sm text-muted-foreground mt-1">Bookings will appear here once customers book your services.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Bookings Bar Chart */}
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-6">Monthly Bookings</h2>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Bar dataKey="bookings" fill="hsl(var(--primary))" name="Bookings" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No data</p>
                )}
              </Card>

              {/* Status Breakdown Pie */}
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-6">Booking Status Breakdown</h2>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {statusData.map((_, index) => (
                          <Cell key={index} fill={BLUE_SHADES[index % BLUE_SHADES.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No data</p>
                )}
              </Card>

              {/* Recent Bookings Table */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-lg font-bold text-foreground mb-4">Recent Bookings</h2>
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No bookings in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Customer</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Service</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Event Date</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 10).map(b => (
                          <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2.5 pr-4 text-foreground">{b.customerName}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{b.service}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {new Date(b.eventDate).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                b.status === 'completed' ? 'bg-green-100 text-green-700' :
                                b.status === 'accepted' ? 'bg-primary/10 text-primary' :
                                b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-medium text-foreground">
                              {b.amountInCents != null ? `Rs. ${(b.amountInCents / 100).toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        Showing 10 of {filtered.length} bookings. Export CSV for the full list.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
