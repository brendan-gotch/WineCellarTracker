import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users, wines, drank_log } from '@/db/schema'
import { eq, isNull, sql } from 'drizzle-orm'
import { setSessionCookie } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password, inviteCode } = await req.json()

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }
  if (username.trim().length < 2) {
    return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const required = process.env.INVITE_CODE
  if (required && inviteCode !== required) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username.trim().toLowerCase())).limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const [user] = await db.insert(users).values({
    username: username.trim().toLowerCase(),
    password_hash,
  }).returning()

  // First user to sign up claims all existing wines that have no owner
  const orphanCount = await db.select({ n: sql<number>`count(*)` }).from(wines).where(isNull(wines.user_id))
  if (Number(orphanCount[0].n) > 0) {
    await db.update(wines).set({ user_id: user.id }).where(isNull(wines.user_id))
    await db.update(drank_log).set({ user_id: user.id }).where(isNull(drank_log.user_id))
  }

  await setSessionCookie({ userId: user.id, username: user.username })
  return NextResponse.json({ ok: true })
}
