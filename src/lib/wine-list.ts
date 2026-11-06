import type { Wine } from '@/db/schema'

export type WineListCategory = 'Sparkling Wines' | 'Dry Wines'
export type WineColor = 'White' | 'Rosé' | 'Red'

const SPARKLING_KEYWORDS = [
  'champagne', 'sparkling', 'cava', 'prosecco', 'crémant', 'cremant',
  'franciacorta', 'sekt', 'pétillant', 'petillant', 'pét-nat', 'pet-nat',
  'lambrusco', "moscato d'asti", 'mousseux', 'espumante', 'espumoso', 'cap classique',
]

const ROSE_KEYWORDS = ['rosé', 'rose', 'rosato', 'rosado', 'tavel']

// Fallback only — used when a wine has no cellar_section assigned yet
const RED_FALLBACK_KEYWORDS = [
  'pinot noir', 'gamay', 'grenache', 'garnacha', 'cinsault', 'syrah', 'shiraz',
  'zinfandel', 'cabernet', 'merlot', 'malbec', 'sangiovese', 'nebbiolo', 'barbera',
  'tempranillo', 'tannat', 'montepulciano', 'carignan', 'mourvèdre', 'mourvedre',
  'petit verdot', 'touriga', 'aglianico', 'red blend', 'bordeaux blend', 'rhône blend',
  'rhone blend', 'gsm', 'nero', 'pinotage', 'mencía', 'mencia', 'blaufränkisch', 'blaufrankisch',
]

export function classifyWine(wine: Wine): { category: WineListCategory; color: WineColor } {
  const text = `${wine.varietal_blend ?? ''} ${wine.wine_name ?? ''}`.toLowerCase()
  const regionText = `${wine.region ?? ''}`.toLowerCase()
  const section = parseInt(wine.cellar_section ?? '')

  const isSparkling = section === 1
    || SPARKLING_KEYWORDS.some(k => text.includes(k) || regionText.includes(k))
  const isRose = section === 5 || ROSE_KEYWORDS.some(k => text.includes(k))

  let color: WineColor
  if (isRose) {
    color = 'Rosé'
  } else if (section >= 6 && section <= 10) {
    color = 'Red'
  } else if (section >= 1 && section <= 4) {
    color = 'White'
  } else {
    color = RED_FALLBACK_KEYWORDS.some(k => text.includes(k)) ? 'Red' : 'White'
  }

  return { category: isSparkling ? 'Sparkling Wines' : 'Dry Wines', color }
}

export interface WineListEntry {
  id: string
  vintage: number | null
  nonVintage: boolean
  winery: string
  wineName: string
  price: number | null
  quantity: number
}

export interface WineListGroup {
  category: WineListCategory
  color: WineColor
  country: string
  region: string
  entries: WineListEntry[]
}

const CATEGORY_ORDER: WineListCategory[] = ['Sparkling Wines', 'Dry Wines']
const COLOR_ORDER: WineColor[] = ['White', 'Rosé', 'Red']

export function buildWineListGroups(wines: Wine[]): WineListGroup[] {
  const active = wines.filter(w => w.quantity_remaining > 0)
  const buckets = new Map<string, WineListGroup>()

  for (const w of active) {
    const { category, color } = classifyWine(w)
    const country = w.country?.trim() || 'Other'
    const region = w.region?.trim() || 'Other'
    const key = `${category}|${color}|${country}|${region}`
    if (!buckets.has(key)) buckets.set(key, { category, color, country, region, entries: [] })
    buckets.get(key)!.entries.push({
      id: w.id,
      vintage: w.vintage,
      nonVintage: !!w.non_vintage,
      winery: w.winery,
      wineName: w.wine_name,
      price: w.price,
      quantity: w.quantity_remaining,
    })
  }

  Array.from(buckets.values()).forEach(g => {
    g.entries.sort((a, b) => a.winery.localeCompare(b.winery) || (b.vintage ?? 0) - (a.vintage ?? 0))
  })

  return Array.from(buckets.values()).sort((a, b) => {
    const c = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (c !== 0) return c
    const co = COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
    if (co !== 0) return co
    const ct = a.country.localeCompare(b.country)
    if (ct !== 0) return ct
    return a.region.localeCompare(b.region)
  })
}

export interface WineListRegionBlock {
  region: string
  entries: WineListEntry[]
}
export interface WineListCountryBlock {
  country: string
  regions: WineListRegionBlock[]
}
export interface WineListColorBlock {
  color: WineColor
  countries: WineListCountryBlock[]
}
export interface WineListCategoryBlock {
  category: WineListCategory
  colors: WineListColorBlock[]
}

export function buildWineListTree(wines: Wine[]): WineListCategoryBlock[] {
  const groups = buildWineListGroups(wines)
  const categories: WineListCategoryBlock[] = []

  for (const g of groups) {
    let cat = categories.find(c => c.category === g.category)
    if (!cat) { cat = { category: g.category, colors: [] }; categories.push(cat) }

    let color = cat.colors.find(c => c.color === g.color)
    if (!color) { color = { color: g.color, countries: [] }; cat.colors.push(color) }

    let country = color.countries.find(c => c.country === g.country)
    if (!country) { country = { country: g.country, regions: [] }; color.countries.push(country) }

    country.regions.push({ region: g.region, entries: g.entries })
  }

  return categories
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildWineListCsv(wines: Wine[]): string {
  const active = wines.filter(w => w.quantity_remaining > 0)
  const header = ['Category', 'Color', 'Country', 'Region', 'Vintage', 'Winery', 'Wine Name', 'Varietal/Blend', 'Format', 'Quantity', 'Price']
  const rows = active
    .map(w => {
      const { category, color } = classifyWine(w)
      return {
        category, color,
        country: w.country ?? '',
        region: w.region ?? '',
        vintage: w.non_vintage ? 'NV' : (w.vintage ?? ''),
        winery: w.winery,
        wine_name: w.wine_name,
        varietal_blend: w.varietal_blend ?? '',
        format: w.format ?? '750ml',
        quantity: w.quantity_remaining,
        price: w.price ?? '',
      }
    })
    .sort((a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      || COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
      || a.country.localeCompare(b.country)
      || a.region.localeCompare(b.region)
      || a.winery.localeCompare(b.winery)
    )
    .map(r => [r.category, r.color, r.country, r.region, r.vintage, r.winery, r.wine_name, r.varietal_blend, r.format, r.quantity, r.price].map(csvCell).join(','))

  return [header.join(','), ...rows].join('\n')
}
