import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export interface SessionData {
  userId: string
  username: string
}

const COOKIE = 'wct_session'
const MAX_AGE = 30 * 24 * 60 * 60

function secret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? 'dev-secret-please-set-SESSION_SECRET-in-production'
  )
}

export async function signToken(data: SessionData): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return { userId: payload.userId as string, username: payload.username as string }
  } catch {
    return null
  }
}

// Use in server components, server actions, and route handlers
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

// Use in middleware (no async cookies() access there)
export function getSessionFromRequest(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return Promise.resolve(null)
  return verifyToken(token)
}

export async function setSessionCookie(data: SessionData) {
  const token = await signToken(data)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
}
