'use server'

import { db } from '@/db'
import { wines, type NewWine } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getWines() {
  return db.select().from(wines).orderBy(desc(wines.created_at))
}

export async function getWine(id: string) {
  const results = await db.select().from(wines).where(eq(wines.id, id)).limit(1)
  return results[0] ?? null
}

export async function createWine(data: Omit<NewWine, 'id' | 'created_at' | 'updated_at'>) {
  const result = await db.insert(wines).values({
    ...data,
    quantity_remaining: data.quantity_remaining ?? data.quantity_added ?? 1,
  }).returning()
  revalidatePath('/')
  return result[0]
}

export async function updateWine(id: string, data: Partial<NewWine>) {
  const result = await db
    .update(wines)
    .set({ ...data, updated_at: new Date() })
    .where(eq(wines.id, id))
    .returning()
  revalidatePath('/')
  return result[0]
}

export async function deleteWine(id: string) {
  await db.delete(wines).where(eq(wines.id, id))
  revalidatePath('/')
}

export async function markVerified(id: string) {
  await db.update(wines).set({ last_verified: new Date(), updated_at: new Date() }).where(eq(wines.id, id))
  revalidatePath('/')
}

export async function getCellarContext() {
  return db
    .select({ winery: wines.winery, region: wines.region, varietal_blend: wines.varietal_blend, why_interesting: wines.why_interesting })
    .from(wines)
    .orderBy(desc(wines.created_at))
    .limit(30)
}

export async function getAlertWines() {
  const currentYear = new Date().getFullYear()
  return db
    .select()
    .from(wines)
    .where(
      sql`${wines.quantity_remaining} > 0 AND ${wines.drinking_window_end} IS NOT NULL AND ${wines.drinking_window_end} < ${currentYear}`
    )
    .orderBy(wines.drinking_window_end)
}
