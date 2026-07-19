'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { logoutUser } from '@/lib/auth'
import {
  LayoutDashboard,
  Briefcase,
  ShoppingCart,
  MessageSquare,
  Settings,
  LogOut,
  Users,
  FileCheck,
  AlertTriangle,
  ImageIcon,
  BarChart3,
  Zap,
  FileText,
  Bell,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  userRole: 'customer' | 'vendor' | 'admin'
  userName?: string
  onLogout?: () => void
}

const getNavItems = (role: 'customer' | 'vendor' | 'admin') => {
  const base = [{ label: 'Dashboard', href: `/${role}/dashboard`, icon: LayoutDashboard }]

  const customer = [
    ...base,
    { label: 'Browse Vendors', href: '/vendors', icon: Briefcase },
    { label: 'My Bookings', href: '/customer/bookings', icon: ShoppingCart },
    { label: 'Disputes', href: '/customer/disputes', icon: AlertTriangle },
    { label: 'Messages', href: '/customer/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/customer/notifications', icon: Bell },
    { label: 'My Profile', href: '/customer/profile', icon: Users },
    { label: 'Settings', href: '/customer/settings', icon: Settings },
  ]

  const vendor = [
    ...base,
    { label: 'Booking Requests', href: '/vendor/requests', icon: FileCheck },
    { label: 'My Bookings', href: '/vendor/bookings', icon: ShoppingCart },
    { label: 'Availability', href: '/vendor/availability', icon: Zap },
    { label: 'My Profile', href: '/vendor/profile', icon: ImageIcon },
    { label: 'Analytics', href: '/vendor/analytics', icon: BarChart3 },
    { label: 'Messages', href: '/vendor/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/vendor/notifications', icon: Bell },
    { label: 'Settings', href: '/vendor/settings', icon: Settings },
  ]

  const admin = [
    ...base,
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Approvals', href: '/admin/approvals', icon: FileCheck },
    { label: 'Bookings', href: '/admin/bookings', icon: ShoppingCart },
    { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
    { label: 'Reviews', href: '/admin/reviews', icon: Star },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Content', href: '/admin/content', icon: FileText },
    { label: 'System Settings', href: '/admin/settings', icon: Zap },
    { label: 'Profile', href: '/admin/profile', icon: Settings },
  ]

  return { customer, vendor, admin }[role]
}

export function Sidebar({ userRole, userName, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, logout: authLogout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navItems = getNavItems(userRole)

  const displayName = userName
    || authUser?.businessName
    || authUser?.fullName
    || 'User'

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      logoutUser()
      authLogout()
      router.push('/login')
    }
  }

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} border-r border-border bg-sidebar min-h-screen flex flex-col transition-all duration-200 shrink-0`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-sidebar-border p-3 gap-2 ${collapsed ? 'justify-center flex-col' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/20'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
