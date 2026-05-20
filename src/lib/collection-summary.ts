import type { Wine } from '@/db/schema'
import { anthropic } from '@/lib/anthropic'
import { db } from '@/db'
import { collectionSummaries } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { computeSectionLabels } from '@/lib/cellar-sections'

const SUMMARY_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RECOMPUTE_THRESHOLD = 0.10

function computeStats(allWines: Wine[]): string {
  const active = allWines.filter(w => w.quantity_remaining > 0)
  const totalBottles = active.reduce((s, w) => s + w.quantity_remaining, 0)

  const varMap: Record<string, number> = {}
  active.forEach(w => {
    if (!w.varietal_blend) return
    const primary = w.varietal_blend.split(/[,/&]/)[0].trim().replace(/^\d+%?\s*/, '')
    if (primary) varMap[primary] = (varMap[primary] || 0) + w.quantity_remaining
  })
  const topVarietals = Object.entries(varMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([v, n]) => `${v} (${Math.round(n / totalBottles * 100)}%)`).join(', ')

  const countryMap: Record<string, number> = {}
  active.forEach(w => {
    if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + w.quantity_remaining
  })
  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([c, n]) => `${c} (${Math.round(n / totalBottles * 100)}%)`).join(', ')

  const sectionMap: Record<string, number> = {}
  active.forEach(w => {
    if (w.cellar_section) sectionMap[w.cellar_section] = (sectionMap[w.cellar_section] || 0) + w.quantity_remaining
  })
  const sectionLabels = computeSectionLabels(active)
  const sectionBreakdown = Object.entries(sectionMap)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([s, n]) => `${sectionLabels[parseInt(s)] ?? `Section ${s}`}: ${n} btl`).join('; ')

  const pricedWines = active.filter(w => w.price != null)
  const pricedBottles = pricedWines.reduce((s, w) => s + w.quantity_remaining, 0)
  const totalValue = pricedWines.reduce((s, w) => s + (w.price ?? 0) * w.quantity_remaining, 0)
  const avgPrice = pricedBottles > 0 ? Math.round(totalValue / pricedBottles) : null
  const prices = pricedWines.map(w => w.price!)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null

  const vintages = active.filter(w => w.vintage).map(w => w.vintage!)
  const vintageRange = vintages.length
    ? `${Math.min(...vintages)}–${Math.max(...vintages)}`
    : 'unknown'

  const now = new Date().getFullYear()
  let notReady = 0, readyNow = 0, atPeak = 0, pastPeak = 0, noWindow = 0
  active.forEach(w => {
    if (!w.drinking_window_start && !w.drinking_window_end) { noWindow++; return }
    const start = w.drinking_window_start ?? 0
    const end = w.drinking_window_end ?? now + 100
    if (now < start) notReady++
    else if (now > end) pastPeak++
    else if (end - now <= 2) atPeak++
    else readyNow++
  })

  return `Wines: ${active.length} entries, ${totalBottles} bottles
Sections: ${sectionBreakdown}
Varietals: ${topVarietals}
Countries: ${topCountries}
Vintages: ${vintageRange}
Price: avg $${avgPrice ?? '?'}/bottle${minPrice != null ? `, range $${minPrice}–$${maxPrice}` : ''}
Drinking status: ${notReady} not yet ready, ${readyNow} drinking well, ${atPeak} at/near peak, ${pastPeak} past peak, ${noWindow} no window set`
}

export async function getCollectionSummary(userId: string, allWines: Wine[]): Promise<string | null> {
  const activeCount = allWines.filter(w => w.quantity_remaining > 0).length
  if (activeCount < 5) return null

  try {
    const [cached] = await db.select().from(collectionSummaries).where(eq(collectionSummaries.user_id, userId)).limit(1)

    if (cached) {
      const age = Date.now() - cached.updated_at.getTime()
      const countChange = Math.abs(activeCount - cached.wine_count) / Math.max(cached.wine_count, 1)
      if (age < SUMMARY_TTL_MS && countChange < RECOMPUTE_THRESHOLD) {
        return cached.summary
      }
    }

    const stats = computeStats(allWines)

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are analyzing a wine collector's cellar. Write a 150–200 word profile covering: the overall character and focus of the collection, its strengths and notable patterns, apparent taste preferences, any interesting gaps or opportunities, and standout characteristics that make it distinctive. Be specific and insightful — this profile will be used by a sommelier assistant to personalize wine facts for this collector. Write only the profile, no headers or preamble.

CELLAR STATISTICS:
${stats}`,
      }],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    const summary = textBlock?.type === 'text' ? textBlock.text.trim() : null
    if (!summary) return null

    await db.insert(collectionSummaries).values({
      user_id: userId,
      summary,
      updated_at: new Date(),
      wine_count: activeCount,
    }).onConflictDoUpdate({
      target: collectionSummaries.user_id,
      set: { summary, updated_at: new Date(), wine_count: activeCount },
    })

    return summary
  } catch (err) {
    console.error('[collection-summary] Error:', err)
    return null
  }
}

export async function invalidateCollectionSummary(userId: string): Promise<void> {
  try {
    await db.delete(collectionSummaries).where(eq(collectionSummaries.user_id, userId))
  } catch {
    // ignore
  }
}
