import { NextRequest, NextResponse } from 'next/server'

// Server-side: reject requests that don't come from our own domain.
// Uses API_SECRET (not NEXT_PUBLIC_) — stays server-side, never in the JS bundle.
// Falls back to origin-based check if no secret is configured.
export function checkApiAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET

  if (secret) {
    // Preferred: explicit shared secret checked server-side only
    const auth = req.headers.get('x-api-secret')
    if (auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
  }

  // Fallback: origin check (prevents cross-origin API abuse from browsers)
  // Allows localhost for local dev, and any request with no origin (server-to-server)
  const origin = req.headers.get('origin')
  if (origin) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
    const isOwnDomain = appUrl ? origin.includes(appUrl) : false
    if (!isLocalhost && !isOwnDomain) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return null
}

// Client-side: returns headers for API requests.
// Reads x-api-secret from a meta tag injected server-side, or falls back to nothing.
// Note: with API_SECRET (not NEXT_PUBLIC_), this header is set via a server action/cookie
// rather than a bundled env var.
export function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Secret is injected into the page at runtime via a <meta> tag (see layout.tsx)
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="x-api-secret"]')
    const secret = meta?.getAttribute('content')
    if (secret) headers['x-api-secret'] = secret
  }
  return headers
}
