'use server'

import { db } from '@/db'
import { drank_log, wines, type NewDrankLog } from '@/db/schema'
import { eq, desc, gt, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'

async function requireUserId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  return session.userId
}

async function decrementWine(wineId: string, userId: string) {
  return db
    .update(wines)
    .set({ quantity_remaining: sql`${wines.quantity_remaining} - 1`, updated_at: new Date() })
    .where(and(eq(wines.id, wineId), eq(wines.user_id, userId), gt(wines.quantity_remaining, 0)))
    .returning({ id: wines.id })
}

export async function logDrank(data: Omit<NewDrankLog, 'id' | 'created_at' | 'user_id'>) {
  const userId = await requireUserId()
  const entry = await db.insert(drank_log).values({ ...data, user_id: userId }).returning()
  await decrementWine(data.wine_id, userId)
  revalidatePath('/')
  return entry[0]
}

export async function removeBottle(wineId: string) {
  const userId = await requireUserId()
  await decrementWine(wineId, userId)
  revalidatePath('/')
}

export async function getDrankLog(wineId?: string) {
  const userId = await requireUserId()
  if (wineId) {
    return db.select().from(drank_log).where(and(eq(drank_log.wine_id, wineId), eq(drank_log.user_id, userId))).orderBy(desc(drank_log.date_drank))
  }
  return db.select().from(drank_log).where(eq(drank_log.user_id, userId)).orderBy(desc(drank_log.date_drank))
}

export async function updateDrankEntry(id: string, data: Partial<NewDrankLog>) {
  const userId = await requireUserId()
  const result = await db.update(drank_log).set(data).where(and(eq(drank_log.id, id), eq(drank_log.user_id, userId))).returning()
  revalidatePath('/')
  return result[0]
}
