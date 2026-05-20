'use server'

import { db } from '@/db'
import { wines, type NewWine } from '@/db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { computeSectionLabels, assignSection } from '@/lib/cellar-sections'

async function requireUserId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')
  return session.userId
}

export async function getWines() {
  const userId = await requireUserId()
  return db.select().from(wines).where(eq(wines.user_id, userId)).orderBy(desc(wines.created_at))
}

export async function getWine(id: string) {
  const userId = await requireUserId()
  const results = await db.select().from(wines).where(and(eq(wines.id, id), eq(wines.user_id, userId))).limit(1)
  return results[0] ?? null
}

export async function createWine(data: Omit<NewWine, 'id' | 'created_at' | 'updated_at'>) {
  const userId = await requireUserId()
  const result = await db.insert(wines).values({
    ...data,
    user_id: userId,
    quantity_remaining: data.quantity_remaining ?? data.quantity_added ?? 1,
  }).returning()
  revalidatePath('/')
  return result[0]
}

export async function updateWine(id: string, data: Partial<NewWine>) {
  const userId = await requireUserId()
  const result = await db
    .update(wines)
    .set({ ...data, updated_at: new Date() })
    .where(and(eq(wines.id, id), eq(wines.user_id, userId)))
    .returning()
  revalidatePath('/')
  return result[0]
}

export async function deleteWine(id: string) {
  const userId = await requireUserId()
  await db.delete(wines).where(and(eq(wines.id, id), eq(wines.user_id, userId)))
  revalidatePath('/')
}

export async function markVerified(id: string) {
  const userId = await requireUserId()
  await db.update(wines).set({ last_verified: new Date(), updated_at: new Date() }).where(and(eq(wines.id, id), eq(wines.user_id, userId)))
  revalidatePath('/')
}

export async function getCellarContext() {
  const userId = await requireUserId()
  return db
    .select({ winery: wines.winery, region: wines.region, varietal_blend: wines.varietal_blend, why_interesting: wines.why_interesting })
    .from(wines)
    .where(eq(wines.user_id, userId))
    .orderBy(desc(wines.quantity_remaining), desc(wines.created_at))
    .limit(30)
}

export async function getSectionCounts(): Promise<Record<number, number>> {
  const userId = await requireUserId()
  const rows = await db
    .select({ section: wines.cellar_section, bottles: sql<number>`sum(${wines.quantity_remaining})` })
    .from(wines)
    .where(eq(wines.user_id, userId))
    .groupBy(wines.cellar_section)
  const counts: Record<number, number> = {}
  for (const row of rows) {
    const n = parseInt(row.section ?? '')
    if (n >= 1 && n <= 10) counts[n] = Number(row.bottles)
  }
  return counts
}

export async function previewSectionReassignment(): Promise<Array<{
  id: string
  winery: string
  wine_name: string
  varietal_blend: string | null
  currentSection: string | null
  proposedSection: string | null
}>> {
  const userId = await requireUserId()
  const allWines = await db.select().from(wines).where(eq(wines.user_id, userId))
  const sectionLabels = computeSectionLabels(allWines)

  return allWines
    .filter(w => w.quantity_remaining > 0)
    .map(w => ({
      id: w.id,
      winery: w.winery,
      wine_name: w.wine_name,
      varietal_blend: w.varietal_blend,
      currentSection: w.cellar_section,
      proposedSection: assignSection(w.varietal_blend, sectionLabels, { region: w.region }),
    }))
    .filter(w => w.currentSection !== '1' && w.proposedSection !== null && w.proposedSection !== w.currentSection)
}

export async function applySectionReassignment(changes: Array<{ id: string; cellar_section: string }>) {
  const userId = await requireUserId()
  for (const { id, cellar_section } of changes) {
    await db.update(wines)
      .set({ cellar_section, updated_at: new Date() })
      .where(and(eq(wines.id, id), eq(wines.user_id, userId)))
  }
  revalidatePath('/')
}
