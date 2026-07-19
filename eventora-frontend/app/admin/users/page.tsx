"use client"

/**
 * Route: /admin/users
 * Purpose: User management (search/filter + basic user actions).
 */

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  Search,
  MoreVertical,
  Ban,
  CheckCircle2,
  Mail,
  Calendar,
  UserCheck,
  ArrowLeft,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { type User } from '@/lib/auth'
import { getAdminUsers, suspendUser, unsuspendUser } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUsersPage() {
  const router = useRouter()
  const [rawUsers, setRawUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setIsLoading(true)
      const users = await getAdminUsers()
      if (cancelled) return
      setRawUsers(users)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const mappedUsers = useMemo(() => {
    return rawUsers
      .map((u) => ({
        id: u.id,
        name: u.fullName || u.email,
        email: u.email,
        role: (u.role || '').charAt(0).toUpperCase() + (u.role || '').slice(1),
        joinedAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—',
        bookings: (u as any).bookings || 0,
        status:
          (u as any).isSuspended || (u as any).suspendedAt || (u as any).rejectedAt
            ? 'suspended'
            : 'active',
        lastActive: '—',
        raw: u,
      }))
      .filter((x) => ['Customer', 'Vendor', 'Admin'].includes(x.role))
  }, [rawUsers])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return mappedUsers.filter((user) => {
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)

      const matchesRole =
        !roleFilter || user.role.toLowerCase() === roleFilter.toLowerCase()

      const matchesStatus =
        !statusFilter || user.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesQuery && matchesRole && matchesStatus
    })
  }, [mappedUsers, roleFilter, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleToggleStatus = async (userId: string) => {
    const current = rawUsers.find((u) => u.id === userId)
    if (!current) return

    const isSuspended = Boolean((current as any).isSuspended || (current as any).suspendedAt || (current as any).rejectedAt)

    if (isSuspended) {
      await unsuspendUser(userId)
    } else {
      await suspendUser(userId, 'Suspended by admin')
    }

    const users = await getAdminUsers()
    setRawUsers(users)
  }

  const handleEmail = (email: string) => {
    if (!email) return
    window.location.href = `mailto:${email}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    if (role === 'Admin') return 'bg-orange-100 text-orange-700'
    return role === 'Vendor' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
  }

  const totalUsers = mappedUsers.length
  const suspendedCount = mappedUsers.filter((u) => u.status === 'suspended').length
  const stats = [
    { label: 'Total Users', value: String(totalUsers || 0), icon: Users },
    { label: 'Active Users', value: String(totalUsers - suspendedCount || 0), icon: CheckCircle2 },
    { label: 'Suspended Accounts', value: String(suspendedCount || 0), icon: Ban },
  ]

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" userName="Admin User" />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
              <p className="text-muted-foreground">Manage all customers and vendors on the platform</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Search and Filter */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Customer">Customers</option>
                <option value="Vendor">Vendors</option>
                <option value="Admin">Admins</option>
              </select>
              <select
                className="px-4 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/12" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Bookings
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No users match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.lastActive}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {user.joinedAt}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground">{user.bookings}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedUser(user)}
                            aria-label="View user details"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEmail(user.email)}
                            aria-label="Send email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleToggleStatus(user.id)}
                            aria-label={user.status === 'suspended' ? 'Activate user' : 'Suspend user'}
                          >
                            {user.status === 'suspended' ? (
                              <UserCheck className="w-4 h-4 text-green-600" />
                            ) : (
                              <Ban className="w-4 h-4 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Basic profile information and quick actions.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{selectedUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{selectedUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium text-foreground">{selectedUser.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground">{selectedUser.status}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedUser && (
              <>
                <Button variant="outline" onClick={() => handleEmail(selectedUser.email)}>
                  Email User
                </Button>
                <Button
                  variant={selectedUser.status === 'suspended' ? 'default' : 'destructive'}
                  onClick={() => {
                    handleToggleStatus(selectedUser.id)
                    setSelectedUser(null)
                  }}
                >
                  {selectedUser.status === 'suspended' ? 'Activate' : 'Suspend'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
