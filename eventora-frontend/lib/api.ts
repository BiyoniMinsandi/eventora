import { getStoredToken } from '@/lib/jwt'

export type ApiError = {
  status: number
  message: string
  details?: unknown
}

// /backend is proxied by Next.js rewrites → real backend (API_URL env var on server).
// Override with NEXT_PUBLIC_API_URL for direct calls (e.g. local dev: http://localhost:5125).
const PROXY_BASE = '/backend'

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || PROXY_BASE).replace(/\/+$/, '')
}

function tryReadJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string
    body?: unknown
    auth?: boolean
    headers?: Record<string, string>
  }
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }

  if (options?.auth !== false) {
    const token = getStoredToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    const parsed = raw ? tryReadJson(raw) : undefined
    const message =
      (parsed && typeof parsed === 'object' && parsed && 'message' in (parsed as any)
        ? String((parsed as any).message)
        : raw) ||
      `Request failed (${res.status})`

    const err: ApiError = { status: res.status, message, details: parsed ?? raw }
    throw err
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return (await res.json()) as T
}

export async function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(url, { method: 'POST', headers, body: form })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    const parsed = raw ? tryReadJson(raw) : undefined
    const message =
      (parsed && typeof parsed === 'object' && 'message' in (parsed as any)
        ? String((parsed as any).message)
        : raw) || `Upload failed (${res.status})`
    throw { status: res.status, message } as ApiError
  }

  return res.json()
}
