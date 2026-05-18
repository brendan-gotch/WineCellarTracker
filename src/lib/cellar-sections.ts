import type { Wine } from '@/db/schema'

export const SECTION_COUNT = 10

export const BASE_SECTION_LABELS: Record<number, string> = {
  1: 'Sparkling',
  2: 'Light Whites',
  3: 'Medium Whites',
  4: 'Full Whites',
  5: 'Light Reds',
  6: 'Medium-Light Reds',
  7: 'Medium Reds',
  8: 'Medium-Full Reds',
  9: 'Full Reds',
  10: 'Big / Age-Worthy Reds',
}

export const SECTION_STYLE_GUIDE = `
Cellar sections 1-10 (assign one number):
1 = Sparkling (Champagne, Prosecco, Cava, Pét-Nat)
2 = Light whites (Pinot Grigio, Muscadet, Vinho Verde, dry Riesling)
3 = Medium whites (Sauvignon Blanc, Grüner Veltliner, Vermentino, Albariño)
4 = Full whites (Chardonnay, Viognier, white Burgundy, Roussanne)
5 = Light reds (Gamay, light Pinot Noir, Schiava, Frappato)
6 = Medium-light reds (Grenache, Barbera, Dolcetto, richer Pinot Noir)
7 = Medium reds (Sangiovese, Tempranillo, Merlot, Côtes du Rhône)
8 = Medium-full reds (Zinfandel, Malbec, GSM blends, Mourvèdre)
9 = Full reds (Cabernet Sauvignon, Bordeaux blends, Syrah/Shiraz)
10 = Big / age-worthy reds (Barolo, Brunello, Amarone, structured Cab)
`

export function computeSectionLabels(wines: Wine[]): Record<number, string> {
  const bySection: Record<number, string[]> = {}

  wines
    .filter(w => w.quantity_remaining > 0)
    .forEach(w => {
      const num = parseInt(w.cellar_section ?? '')
      if (num >= 1 && num <= 10 && w.varietal_blend) {
        if (!bySection[num]) bySection[num] = []
        // Take first varietal before any comma/slash/ampersand
        const primary = w.varietal_blend.split(/[,/&]/)[0].trim()
        if (primary) bySection[num].push(primary)
      }
    })

  const labels: Record<number, string> = {}
  for (let i = 1; i <= 10; i++) {
    const varietals = bySection[i] ?? []
    if (varietals.length === 0) {
      labels[i] = `${i} — ${BASE_SECTION_LABELS[i]}`
    } else {
      // Top 2 by frequency
      const freq: Record<string, number> = {}
      varietals.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k)
      labels[i] = `${i} (${top.join(' & ')})`
    }
  }
  return labels
}
