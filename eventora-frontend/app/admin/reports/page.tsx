'use client'

/**
 * Route: /admin/reports
 * Purpose: Create/export admin reports.
 */

import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, TrendingUp, DollarSign, Activity } from 'lucide-react'

export default function AdminReportsPage() {
  const monthlyData = [
    { month: 'Jan', bookings: 120, revenue: 450000 },
    { month: 'Feb', bookings: 145, revenue: 580000 },
    { month: 'Mar', bookings: 165, revenue: 620000 },
    { month: 'Apr', bookings: 190, revenue: 750000 },
    { month: 'May', bookings: 210, revenue: 850000 },
    { month: 'Jun', bookings: 240, revenue: 950000 },
  ]

  const categoryData = [
    { name: 'Photography', value: 240, color: '#3b82f6' },
    { name: 'Catering', value: 180, color: '#f59e0b' },
    { name: 'Decoration', value: 150, color: '#ec4899' },
    { name: 'Venues', value: 120, color: '#10b981' },
    { name: 'Entertainment', value: 90, color: '#8b5cf6' },
  ]

  const vendorPerformance = [
    {
      rank: 1,
      name: 'Grand Ballroom Venue',
      bookings: 156,
      revenue: '₨78,000,000',
      rating: 4.9,
    },
    {
      rank: 2,
      name: 'Lens Moments Photography',
      bookings: 128,
      revenue: '₨64,000,000',
      rating: 4.9,
    },
    {
      rank: 3,
      name: 'Sweet Delights Catering',
      bookings: 95,
      revenue: '₨47,500,000',
      rating: 4.8,
    },
    {
      rank: 4,
      name: 'Elegant Decorators Studio',
      bookings: 82,
      revenue: '₨41,000,000',
      rating: 4.7,
    },
    {
      rank: 5,
      name: 'Rhythm & Beats Entertainment',
      bookings: 67,
      revenue: '₨33,500,000',
      rating: 4.6,
    },
  ]

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" userName="Admin User" />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">Platform performance and insights</p>
            </div>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-foreground">₨46.5M</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg text-green-600">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-green-600">+12% from last month</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
                  <p className="text-3xl font-bold text-foreground">1,070</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-blue-600">+28% from last month</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Avg. Order Value</p>
                  <p className="text-3xl font-bold text-foreground">₨43,458</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-purple-600">+5% from last month</p>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Monthly Bookings and Revenue */}
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-foreground mb-6">Monthly Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Category Distribution */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Bookings by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Vendor Performance */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-6">Top Performing Vendors</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Vendor Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Bookings
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Revenue
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPerformance.map((vendor) => (
                    <tr
                      key={vendor.rank}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-bold text-sm">
                          {vendor.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{vendor.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{vendor.bookings}</td>
                      <td className="px-6 py-4 font-medium text-primary">{vendor.revenue}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">{vendor.rating}</span>
                          <span className="text-yellow-500">★</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
