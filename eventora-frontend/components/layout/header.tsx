'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Menu, X, LogOut, User, Bell, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { logoutUser, getRoleRedirectUrl } from '@/lib/auth'
import { getUnreadNotificationCount } from '@/lib/data'

export function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout: authLogout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) { setUnreadCount(0); return }
    const fetch = async () => {
      try { setUnreadCount(await getUnreadNotificationCount(user.id)) } catch {}
    }
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [isAuthenticated, user])

  const handleLogout = () => {
    logoutUser(); authLogout(); router.push('/login')
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/vendors', label: 'Browse Vendors' },
    { href: '/about', label: 'About' },
  ]

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'border-b border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <CalendarDays className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Eventora
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <Link
                  href={`/${user.role === 'admin' ? 'admin' : user.role === 'vendor' ? 'vendor' : 'customer'}/notifications`}
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  href={getRoleRedirectUrl(user.role)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.fullName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 mt-2 flex gap-2">
              {isAuthenticated && user ? (
                <>
                  <Link
                    href={getRoleRedirectUrl(user.role)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" /> Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex-1 text-center px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 text-center px-3 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
