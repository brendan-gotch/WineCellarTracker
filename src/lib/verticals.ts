import type { Wine } from '@/db/schema'

// Normalize a wine identifier for fuzzy grouping:
// strips diacritics, common wine-vocabulary words, articles/prepositions, punctuation
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')                   // strip combining accents
    .replace(/\b(vineyard|vineyards|estate|estates|winery|wineries|domaine|domain|chateau|cellars?|wines?|maison|clos|vins?|mas)\b/g, '')
    .replace(/\b(de|du|des|la|le|les|di|del|della|dei|delle|el|los|las)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Vertical = {
  key: string
  winery: string      // display name from representative wine
  wine_name: string   // display name from representative wine
  vintages: number[]  // sorted asc
  wines: Wine[]       // sorted desc (newest first)
  totalBottles: number
}

export function computeVerticals(wines: Wine[]): Vertical[] {
  const active = wines.filter((w: Wine) => w.quantity_remaining > 0 && !w.non_vintage && w.vintage != null)

  const groups: Record<string, Wine[]> = {}
  for (const wine of active) {
    const key = `${normalize(wine.winery)} ${normalize(wine.wine_name)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(wine)
  }

  const verticals: Vertical[] = []
  for (const key of Object.keys(groups)) {
    const group = groups[key]
    const vintageSet: Record<number, true> = {}
    group.forEach((w: Wine) => { if (w.vintage != null) vintageSet[w.vintage] = true })
    const distinctVintages = Object.keys(vintageSet).map(Number).sort((a, b) => a - b)
    if (distinctVintages.length < 3) continue

    const rep = group.reduce((best: Wine, w: Wine) =>
      (w.winery + w.wine_name).length > (best.winery + best.wine_name).length ? w : best,
      group[0]
    )
    const sorted = group.slice().sort((a: Wine, b: Wine) => (b.vintage ?? 0) - (a.vintage ?? 0))
    const totalBottles = group.reduce((s: number, w: Wine) => s + w.quantity_remaining, 0)

    verticals.push({ key, winery: rep.winery, wine_name: rep.wine_name, vintages: distinctVintages, wines: sorted, totalBottles })
  }

  return verticals.sort((a, b) => b.vintages.length - a.vintages.length || b.totalBottles - a.totalBottles)
}

// Build an O(1) lookup: wine.id → Vertical
export function indexVerticals(verticals: Vertical[]): Map<string, Vertical> {
  const map = new Map<string, Vertical>()
  for (const v of verticals) {
    for (const wine of v.wines) map.set(wine.id, v)
  }
  return map
}
