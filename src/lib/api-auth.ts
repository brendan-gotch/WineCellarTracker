import { NextRequest, NextResponse } from 'next/server'

// Returns a 401 response if the request lacks a valid API secret.
// If NEXT_PUBLIC_API_SECRET is not set, auth is skipped (local dev).
export function checkApiAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.NEXT_PUBLIC_API_SECRET
  if (!secret) return null // not configured, skip

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// Returns headers for client-side API requests
export function apiHeaders(): Record<string, string> {
  const secret = process.env.NEXT_PUBLIC_API_SECRET
  return {
    'Content-Type': 'application/json',
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  }
}
