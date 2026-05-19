import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { setSessionCookie } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const [user] = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase())).limit(1)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  await setSessionCookie({ userId: user.id, username: user.username })
  return NextResponse.json({ ok: true })
}
