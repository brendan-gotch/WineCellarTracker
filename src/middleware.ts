import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/session'

const PUBLIC_PREFIXES = ['/login', '/signup', '/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('wct_session')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const session = await verifyToken(token)
  if (!session) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('wct_session')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons).*)'],
}
