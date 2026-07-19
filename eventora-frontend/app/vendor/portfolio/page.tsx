'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorPortfolioRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/vendor/profile')
  }, [router])
  return null
}
