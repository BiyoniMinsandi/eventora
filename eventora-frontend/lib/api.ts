import { getStoredToken } from '@/lib/jwt'

// Shape of every error thrown by apiFetch and uploadFile.
// Callers can catch and check error.status to handle specific cases (401, 403, etc.).
export type ApiError = {
  status: number    // HTTP status code returned by the backend
  message: string   // Human-readable error message extracted from the response body
  details?: unknown // Full raw response body for debugging (optional)
}

// In production (Vercel), Next.js rewrites /backend/* → Railway backend URL.
// In local dev, NEXT_PUBLIC_API_URL overrides this to point directly at localhost.
const PROXY_BASE = '/backend'

// Returns the correct base URL depending on the environment.
// Local dev: NEXT_PUBLIC_API_URL (e.g. http://localhost:5000)
// Production: /backend (proxied by next.config.mjs to Railway)
// Trailing slashes are stripped to prevent double-slash URLs.
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || PROXY_BASE).replace(/\/+$/, '')
}

// Safely parses a JSON string without throwing.
// Returns undefined if the string is empty or not valid JSON.
// Used when reading error response bodies that may or may not be JSON.
function tryReadJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// Central HTTP fetch wrapper used by every API call in the app.
// Automatically attaches the JWT Bearer token from localStorage.
// Throws an ApiError on any non-2xx response with a parsed error message.
// T is the expected return type — callers specify it for full type safety.
export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string                    // HTTP method — defaults to 'GET'
    body?: unknown                     // Request body — serialized to JSON automatically
    auth?: boolean                     // Set to false to skip JWT header (public endpoints)
    headers?: Record<string, string>   // Extra headers merged on top of defaults
  }
): Promise<T> {
  const baseUrl = getApiBaseUrl()

  // Build the full URL. If path is already a full URL (starts with http), use it as-is.
  // Otherwise prefix with baseUrl and ensure exactly one slash between them.
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  // Start with Content-Type JSON, then spread any caller-provided headers on top.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }

  // Attach JWT unless the caller explicitly passes auth: false.
  // auth is undefined by default, and undefined !== false, so auth is on by default.
  if (options?.auth !== false) {
    const token = getStoredToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Make the HTTP request. body is undefined for GET requests (no body sent).
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })

  // Handle error responses (4xx, 5xx).
  // Extract the most useful message from the response body in priority order:
  // 1. JSON body with a "message" field  2. Raw text body  3. Generic fallback
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

  // HTTP 204 means success with no response body — return undefined without parsing.
  if (res.status === 204) return undefined as T

  // Parse and return the JSON response body typed as T.
  return (await res.json()) as T
}

// Uploads a single file to the backend using multipart/form-data.
// Returns the CDN URL of the uploaded file (Cloudinary URL stored in MongoDB).
// Does NOT set Content-Type manually — the browser sets it automatically
// with the correct multipart boundary required for file parsing on the backend.
export async function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  // Attach JWT for authentication — file uploads are always authenticated.
  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  // FormData automatically encodes the file in multipart/form-data format.
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

  // Returns { url: "https://res.cloudinary.com/..." }
  return res.json()
}
