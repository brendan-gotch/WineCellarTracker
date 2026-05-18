'use server'

import { db } from '@/db'
import { drank_log, wines, type NewDrankLog } from '@/db/schema'
import { eq, desc, gt, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// Atomic decrement: single SQL update that only fires if quantity > 0
async function decrementWine(wineId: string) {
  return db
    .update(wines)
    .set({ quantity_remaining: sql`${wines.quantity_remaining} - 1`, updated_at: new Date() })
    .where(and(eq(wines.id, wineId), gt(wines.quantity_remaining, 0)))
    .returning({ id: wines.id })
}

export async function logDrank(data: Omit<NewDrankLog, 'id' | 'created_at'>) {
  const entry = await db.insert(drank_log).values(data).returning()
  await decrementWine(data.wine_id)
  revalidatePath('/')
  return entry[0]
}

// Remove a bottle without creating a drank log entry (broke it, gave it away, etc.)
export async function removeBottle(wineId: string) {
  await decrementWine(wineId)
  revalidatePath('/')
}

export async function getDrankLog(wineId?: string) {
  if (wineId) {
    return db.select().from(drank_log).where(eq(drank_log.wine_id, wineId)).orderBy(desc(drank_log.date_drank))
  }
  return db.select().from(drank_log).orderBy(desc(drank_log.date_drank))
}

export async function updateDrankEntry(id: string, data: Partial<NewDrankLog>) {
  const result = await db.update(drank_log).set(data).where(eq(drank_log.id, id)).returning()
  revalidatePath('/')
  return result[0]
}
