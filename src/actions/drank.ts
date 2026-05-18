'use server'

import { db } from '@/db'
import { drank_log, wines, type NewDrankLog } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function logDrank(data: Omit<NewDrankLog, 'id' | 'created_at'>) {
  const entry = await db.insert(drank_log).values(data).returning()

  // Decrement quantity_remaining
  const wine = await db.select().from(wines).where(eq(wines.id, data.wine_id)).limit(1)
  if (wine[0] && wine[0].quantity_remaining > 0) {
    await db
      .update(wines)
      .set({ quantity_remaining: wine[0].quantity_remaining - 1, updated_at: new Date() })
      .where(eq(wines.id, data.wine_id))
  }

  revalidatePath('/')
  return entry[0]
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
