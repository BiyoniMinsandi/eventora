import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// API_URL is a server-side env var — never exposed to the browser.
// Frontend calls /backend/:path* and Next.js proxies to the real backend.
// Set NEXT_PUBLIC_API_URL to override with a direct URL (e.g. local dev).
const API_PROXY_TARGET = process.env.API_URL || 'http://localhost:5125'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ]
  },
}

export default nextConfig
