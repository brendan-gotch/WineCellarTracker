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

// Shown when a section has no wines yet
const SECTION_EXAMPLE_LABELS: Record<number, string> = {
  1: '1 — Sparkling (Champagne, Pét-Nat)',
  2: '2 — Light Whites (Pinot Grigio, Muscadet)',
  3: '3 — Medium Whites (Sauvignon Blanc, Grüner)',
  4: '4 — Full Whites (Chardonnay, Viognier)',
  5: '5 — Light Reds (Gamay, light Pinot Noir)',
  6: '6 — Medium Reds (Grenache, richer Pinot Noir)',
  7: '7 — Medium Reds (Sangiovese, Tempranillo)',
  8: '8 — Medium-Full Reds (Zinfandel, GSM)',
  9: '9 — Full Reds (Cab Sauvignon, Syrah)',
  10: '10 — Big Reds (Barolo, Brunello, Amarone)',
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
      labels[i] = SECTION_EXAMPLE_LABELS[i]
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
