import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
  // Proxy /backend/* → real backend. Only active when API_URL is set (e.g. on Vercel).
  // Without it the frontend uses NEXT_PUBLIC_API_URL (local dev) or shows a fetch error.
  ...(process.env.API_URL
    ? {
        async rewrites() {
          const target = process.env.API_URL.replace(/\/+$/, '')
          return [{ source: '/backend/:path*', destination: `${target}/:path*` }]
        },
      }
    : {}),
}

export default nextConfig
