'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  Download, Filter, Calendar, TrendingUp, TrendingDown,
  ArrowLeft, RefreshCw, Users, ShoppingCart, Star, CheckCircle2, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getBookings, getAdminUsers, type Booking } from '@/lib/data'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/auth'

// ── Theme colours (used in Recharts SVG — CSS vars don't work there) ─────────
const C = {
  primary:  '#2563eb',
  sky:      '#0ea5e9',
  green:    '#16a34a',
  amber:    '#f59e0b',
  red:      '#ef4444',
  violet:   '#8b5cf6',
  slate:    '#94a3b8',
}
const PIE_COLORS = [C.primary, C.sky, C.green, C.amber, C.red, C.violet]

// ── Types ─────────────────────────────────────────────────────────────────────
type RangeKey = 'today' | 'week' | 'month' | '6months' | 'year'
type StatusFilter = 'all' | 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled'

interface PlatformStats {
  customers: number
  approvedVendors: number
  totalBookings: number
  completedBookings: number
  reviews: number
  averageRating: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function startOf(key: RangeKey): Date {
  const d = new Date()
  switch (key) {
    case 'today':   d.setHours(0, 0, 0, 0); break
    case 'week':    d.setDate(d.getDate() - 7); break
    case 'month':   d.setMonth(d.getMonth() - 1); break
    case '6months': d.setMonth(d.getMonth() - 6); break
    case 'year':    d.setFullYear(d.getFullYear() - 1); break
  }
  return d
}

function prevStart(key: RangeKey, current: Date): Date {
  const d = new Date(current)
  switch (key) {
    case 'today':   d.setDate(d.getDate() - 1); break
    case 'week':    d.setDate(d.getDate() - 7); break
    case 'month':   d.setMonth(d.getMonth() - 1); break
    case '6months': d.setMonth(d.getMonth() - 6); break
    case 'year':    d.setFullYear(d.getFullYear() - 1); break
  }
  return d
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0
  return Math.round(((a - b) / b) * 100)
}

function groupByMonth(list: Booking[]) {
  const map = new Map<string, { month: string; bookings: number; completed: number; revenue: number; customers: Set<string>; vendors: Set<string> }>()
  list.forEach(b => {
    const d = new Date(b.createdAt || b.eventDate)
    const key = d.toLocaleString(undefined, { month: 'short', year: '2-digit' })
    if (!map.has(key)) map.set(key, { month: key, bookings: 0, completed: 0, revenue: 0, customers: new Set(), vendors: new Set() })
    const e = map.get(key)!
    e.bookings++
    if (b.status === 'completed') e.completed++
    if (b.amountInCents) e.revenue += b.amountInCents / 100
    e.customers.add(b.customerId)
    e.vendors.add(b.vendorId)
  })
  return Array.from(map.values()).map(v => ({
    month: v.month,
    bookings: v.bookings,
    completed: v.completed,
    revenue: Math.round(v.revenue),
    customers: v.customers.size,
    vendors: v.vendors.size,
  }))
}

function byCategory(list: Booking[]) {
  const map = new Map<string, number>()
  list.forEach(b => {
    const cat = b.service || b.eventType || 'Other'
    map.set(cat, (map.get(cat) || 0) + 1)
  })
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))
}

function topVendors(list: Booking[]) {
  const map = new Map<string, number>()
  list.forEach(b => {
    const name = b.vendorBusinessName || b.vendorName || 'Unknown'
    map.set(name, (map.get(name) || 0) + 1)
  })
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
}

function exportCSV(bookings: Booking[]) {
  const headers = ['ID', 'Customer', 'Vendor', 'Service', 'Event Type', 'Event Date', 'Status', 'Payment', 'Amount (LKR)', 'Created At']
  const rows = bookings.map(b => [
    b.id,
    b.customerName,
    b.vendorBusinessName || b.vendorName,
    b.service,
    b.eventType,
    b.eventDate,
    b.status,
    b.paymentStatus,
    b.amountInCents ? (b.amountInCents / 100).toFixed(2) : '',
    b.createdAt,
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eventora-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, growth, sub }: { label: string; value: string | number; growth?: number; sub?: string }) {
  const up = growth !== undefined && growth >= 0
  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {growth !== undefined && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{growth}% vs previous period
        </p>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const router = useRouter()

  const [range, setRange] = useState<RangeKey>('6months')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadData() {
    try {
      const [b, u, s] = await Promise.all([
        getBookings().catch(() => [] as Booking[]),
        getAdminUsers().catch(() => [] as User[]),
        apiFetch<PlatformStats>('/api/stats', { auth: false }).catch(() => null),
      ])
      setBookings(b)
      setUsers(u)
      setStats(s)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────
  const now = useMemo(() => new Date(), [lastRefresh])
  const rangeStart = useMemo(() => startOf(range), [range, lastRefresh])
  const prevRangeStart = useMemo(() => prevStart(range, rangeStart), [rangeStart])

  const inRange = useMemo(() => bookings.filter(b => {
    const t = new Date(b.createdAt || b.eventDate)
    return t >= rangeStart && t <= now
  }), [bookings, rangeStart, now])

  const inPrev = useMemo(() => bookings.filter(b => {
    const t = new Date(b.createdAt || b.eventDate)
    return t >= prevRangeStart && t < rangeStart
  }), [bookings, prevRangeStart, rangeStart])

  const filtered = useMemo(() =>
    statusFilter === 'all' ? inRange : inRange.filter(b => b.status === statusFilter),
    [inRange, statusFilter]
  )

  const monthData = useMemo(() => groupByMonth(inRange), [inRange])
  const catData = useMemo(() => byCategory(filtered), [filtered])
  const vendorData = useMemo(() => topVendors(filtered), [filtered])

  const totalRevenue = useMemo(() =>
    filtered.reduce((s, b) => s + (b.amountInCents ? b.amountInCents / 100 : 0), 0),
    [filtered]
  )
  const prevRevenue = useMemo(() =>
    inPrev.reduce((s, b) => s + (b.amountInCents ? b.amountInCents / 100 : 0), 0),
    [inPrev]
  )

  const uniqueCustomers = new Set(filtered.map(b => b.customerId)).size
  const prevCustomers = new Set(inPrev.map(b => b.customerId)).size
  const completionRate = filtered.length === 0 ? 0 : Math.round((filtered.filter(b => b.status === 'completed').length / filtered.length) * 100)

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    inRange.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({ status, count }))
  }, [inRange])

  // ── Tooltip styles ────────────────────────────────────────────────────────
  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9' }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading analytics…</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Platform Analytics</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Live · refreshed {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={showFilter ? 'default' : 'outline'}
                className={showFilter ? 'gap-2' : 'gap-2 bg-transparent'}
                onClick={() => setShowFilter(v => !v)}
              >
                <Filter className="w-4 h-4" />
                {showFilter ? 'Hide Filter' : 'Filter'}
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => exportCSV(filtered)}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent"
                onClick={loadData}
                title="Refresh now"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Filter Panel ────────────────────────────────────────────── */}
          {showFilter && (
            <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Filter by Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'] as StatusFilter[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${
                          statusFilter === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {s}
                        {s !== 'all' && (
                          <span className="ml-1 opacity-70">
                            ({inRange.filter(b => b.status === s).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setStatusFilter('all'); setShowFilter(false) }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          )}

          {/* ── Date Range ──────────────────────────────────────────────── */}
          <Card className="p-4 mb-6 bg-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{fmt(rangeStart)} — {fmt(now)}</span>
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="capitalize">{statusFilter}</Badge>
                )}
              </div>
              <div className="flex gap-1">
                {(['today', 'week', 'month', '6months', 'year'] as RangeKey[]).map(k => (
                  <Button key={k} variant={range === k ? 'default' : 'ghost'} size="sm" onClick={() => setRange(k)}>
                    {{ today: 'Today', week: '7d', month: '1m', '6months': '6m', year: '1y' }[k]}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* ── KPI Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Total Bookings"
              value={filtered.length}
              growth={pct(filtered.length, inPrev.length)}
            />
            <KpiCard
              label="Active Customers"
              value={uniqueCustomers}
              growth={pct(uniqueCustomers, prevCustomers)}
            />
            <KpiCard
              label="Approved Vendors"
              value={stats?.approvedVendors ?? users.filter(u => u.role === 'vendor' && u.approved).length}
              sub="Total on platform"
            />
            <KpiCard
              label="Avg Rating"
              value={stats?.averageRating ? `${stats.averageRating} ★` : '—'}
              sub={`from ${stats?.reviews ?? 0} reviews`}
            />
          </div>

          {/* ── Revenue + completion row ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Revenue (range)</p>
              <p className="text-3xl font-bold text-foreground">
                {totalRevenue > 0 ? `Rs. ${totalRevenue.toLocaleString()}` : '—'}
              </p>
              {prevRevenue > 0 && (
                <p className={`text-xs mt-2 flex items-center gap-1 ${pct(totalRevenue, prevRevenue) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {pct(totalRevenue, prevRevenue) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {pct(totalRevenue, prevRevenue) >= 0 ? '+' : ''}{pct(totalRevenue, prevRevenue)}% vs previous period
                </p>
              )}
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-foreground">{completionRate}%</p>
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Status Breakdown</p>
              <div className="space-y-1">
                {statusBreakdown.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{status}</span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
                {statusBreakdown.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
              </div>
            </Card>
          </div>

          {/* ── Charts Row 1: Growth + Monthly Bookings ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Growth Trend</h2>
              {monthData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">No data for selected range</p>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="customers" stroke={C.primary} name="Customers" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="vendors" stroke={C.sky} name="Vendors" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bookings" stroke={C.green} name="Bookings" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Monthly Bookings</h2>
              {monthData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">No data for selected range</p>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="bookings" fill={C.primary} name="Bookings" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="completed" fill={C.green} name="Completed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </Card>
          </div>

          {/* ── Charts Row 2: Category + Top Vendors + User split ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Bookings by Category</h2>
              {catData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {catData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Top Vendors</h2>
              {vendorData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={vendorData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill={C.violet} name="Bookings" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Platform Overview</h2>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Total Customers</span>
                    <span className="font-semibold">{stats?.customers ?? users.filter(u => u.role === 'customer').length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Completed Bookings</span>
                    <span className="font-semibold">{stats?.completedBookings ?? filtered.filter(b => b.status === 'completed').length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-500" style={{
                      width: stats
                        ? `${Math.min(100, Math.round((stats.completedBookings / (stats.totalBookings || 1)) * 100))}%`
                        : `${completionRate}%`
                    }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Average Rating</span>
                    <span className="font-semibold">{stats?.averageRating ?? '—'} / 5</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${((stats?.averageRating ?? 0) / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completion Rate</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
