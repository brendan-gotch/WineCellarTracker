import type { Wine } from '@/db/schema'

export const SECTION_COUNT = 10

export const BASE_SECTION_LABELS: Record<number, string> = {
  1: '1 — Champagne & Sparkling',
  2: '2 — Whites (Sauvignon Blanc, Albariño, Grüner Veltliner)',
  3: '3 — Whites (Chardonnay, Viognier, Roussanne)',
  4: '4 — Whites (Riesling, Gewürztraminer, Chenin Blanc)',
  5: '5 — Rosé',
  6: '6 — Reds (Pinot Noir, Gamay, Grenache)',
  7: '7 — Reds (Sangiovese, Barbera, Nebbiolo)',
  8: '8 — Reds (Syrah, Zinfandel, Cabernet Franc)',
  9: '9 — Reds (Cabernet Sauvignon, Merlot, Petit Verdot)',
  10: '10 — Reds (Tempranillo, Malbec, Tannat)',
}

// Blend keywords → section. Checked before varietal map (more specific).
const BLEND_SECTION_MAP: [string, number][] = [
  // Sparkling blends
  ['blanc de blancs', 1], ['blanc de noirs', 1], ['champagne blend', 1],
  ['cava blend', 1], ['crémant blend', 1], ['cremant blend', 1], ['traditional method', 1],

  // Rosé blends
  ['rosé blend', 5], ['rose blend', 5], ['provence blend', 5],
  ['rosato blend', 5], ['rosado blend', 5],

  // White blends
  ['white rhône blend', 3], ['white rhone blend', 3], ['rhône blanc', 3], ['rhone blanc', 3], ['white bordeaux', 3],

  // Italian red blends
  ['valpolicella', 7], ['amarone', 7], ['ripasso', 7],
  ['super tuscan', 7], ['chianti', 7],

  // Rhône red blends
  ['gsm', 8], ['grenache syrah', 8],
  ['rhône blend', 8], ['rhone blend', 8], ['rhône red', 8], ['rhone red', 8],
  ['southern rhône', 8], ['southern rhone', 8],
  ['châteauneuf', 8], ['chateauneuf', 8],
  ['bandol', 8], ['priorat', 8],
  ['côtes du rhône', 8], ['cotes du rhone', 8],

  // Bordeaux red blends
  ['bordeaux blend', 9], ['bordeaux-style', 9], ['bordeaux style', 9],
  ['meritage', 9], ['left bank blend', 9], ['right bank blend', 9],

  // Other red blends
  ['rioja blend', 10], ['ribera del duero', 10], ['douro blend', 10],
  ['port blend', 10],
]

// Varietal keywords → section. Order matters: more specific before less specific.
const VARIETAL_SECTION_MAP: [string, number][] = [
  // Section 1 — Sparkling
  ['champagne', 1], ['sparkling', 1], ['cava', 1], ['prosecco', 1],
  ['crémant', 1], ['cremant', 1], ['franciacorta', 1], ['sekt', 1],
  ['pétillant', 1], ['petillant', 1], ['pét-nat', 1], ['pet-nat', 1],
  ['lambrusco', 1], ["moscato d'asti", 1],

  // Section 2 — Whites (crisp/light) — specific phrases first
  ['sauvignon blanc', 2], ['sauv blanc', 2], ['fumé blanc', 2],
  ['albariño', 2], ['albarino', 2], ['alvarinho', 2],
  ['grüner veltliner', 2], ['gruner veltliner', 2],
  ['pinot grigio', 2],   // before 'pinot gris' below
  ['vermentino', 2], ['verdejo', 2], ['muscadet', 2],
  ['vinho verde', 2], ['soave', 2], ['gavi', 2], ['arneis', 2],
  ['verdicchio', 2], ['assyrtiko', 2], ['falanghina', 2],
  ['fiano', 2], ['torrontés', 2], ['torrontes', 2],
  ['trebbiano', 2], ['ugni blanc', 2],
  ['picpoul', 2], ['piquepoul', 2],
  ['viura', 2], ['macabeo', 2],                         // Spanish whites
  ['godello', 2], ['loureiro', 2], ['arinto', 2],       // Portuguese whites
  ['müller-thurgau', 2], ['muller-thurgau', 2],         // German whites
  ['silvaner', 2], ['sylvaner', 2],

  // Section 3 — Whites (full/rich)
  ['chardonnay', 3], ['viognier', 3], ['roussanne', 3], ['marsanne', 3],
  ['semillon', 3], ['sémillon', 3], ['verdelho', 3],

  // Section 4 — Whites (aromatic/sweeter)
  ['riesling', 4], ['gewürztraminer', 4], ['gewurztraminer', 4],
  ['chenin blanc', 4], ['pinot gris', 4],
  ['pinot blanc', 4], ['pinot bianco', 4],
  ['grauburgunder', 4],                                 // German Pinot Gris
  ['weißburgunder', 4], ['weissburgunder', 4],          // German Pinot Blanc
  ['muscat', 4], ['moscato', 4], ['furmint', 4],
  ['welschriesling', 4], ['aligoté', 4], ['aligote', 4],
  ['scheurebe', 4], ['malvasia', 4],

  // Section 5 — Rosé (specific color names)
  ['grenache blanc', 2], ['grenache gris', 5], // edge cases before generic 'grenache'
  ['rosé', 5], ['rosato', 5], ['rosado', 5], ['tavel', 5],

  // Section 6 — Reds (lightest)
  ['pinot noir', 6], ['pinot meunier', 6],
  ['spätburgunder', 6], ['spatburgunder', 6], ['blauburgunder', 6], // German/Austrian Pinot Noir
  ['gamay', 6],
  ['grenache', 6], ['garnacha', 6], ['garnatxa', 6],
  ['cinsault', 6], ['cinsaut', 6],
  ['schiava', 6], ['vernatsch', 6], ['trollinger', 6],
  ['zweigelt', 6], ['st. laurent', 6],
  ['frappato', 6], ['nerello', 6],

  // Section 7 — Reds (light-medium, high acid)
  ['sangiovese', 7], ['brunello', 7], ['morellino', 7], ['prugnolo', 7], // Sangiovese clones
  ['barbera', 7], ['nebbiolo', 7], ['dolcetto', 7],
  ['montepulciano', 7], ['corvina', 7], ['rondinella', 7],
  ["nero d'avola", 7], ['gaglioppo', 7],
  ['lagrein', 7], ['teroldego', 7], ['refosco', 7],
  ['ciliegiolo', 7],

  // Section 8 — Reds (medium, structured)
  ['syrah', 8], ['shiraz', 8],
  ['zinfandel', 8], ['primitivo', 8],
  ['cabernet franc', 8], ['cab franc', 8],  // lighter than Cab Sauv
  ['mourvèdre', 8], ['mourvedre', 8], ['monastrell', 8],
  ['carignan', 8], ['cariñena', 8], ['carinena', 8],
  ['petite sirah', 8], ['durif', 8],
  ['blaufränkisch', 8], ['blaufrankisch', 8], ['lemberger', 8], ['kékfrankos', 8], ['kekfrankos', 8],

  // Section 9 — Reds (full, Bordeaux)
  ['cabernet sauvignon', 9], ['cab sauvignon', 9],
  ['merlot', 9], ['petit verdot', 9],
  ['carménère', 9], ['carmenere', 9],

  // Section 10 — Reds (full+ everything else)
  ['tempranillo', 10], ['tinta roriz', 10], ['aragonez', 10],
  ['malbec', 10],
  ['tannat', 10],
  ['touriga nacional', 10], ['touriga', 10],
  ['aglianico', 10], ['sagrantino', 10],
  ['xinomavro', 10],
  ['pinotage', 10],
  ['mencía', 10], ['mencia', 10],
  ['baga', 10], ['trincadeira', 10],
  ['bonarda', 10],
]

const SPARKLING_REGIONS = [
  'champagne', 'prosecco', 'cava', 'franciacorta', 'crémant', 'cremant',
  'sekt', 'mousseux', 'espumante', 'espumoso', 'cap classique',
]

export function assignSection(
  varietal: string | null | undefined,
  sectionLabels: Record<number, string>,
  hints?: { region?: string | null },
): string | null {
  // Region beats varietal — a Champagne-region Chardonnay is still sparkling
  const regionLower = (hints?.region ?? '').toLowerCase()
  if (regionLower && SPARKLING_REGIONS.some(r => regionLower.includes(r))) return '1'

  if (!varietal) return null
  const v = varietal.toLowerCase()

  // 1. Blend map (most specific)
  for (const [keyword, section] of BLEND_SECTION_MAP) {
    if (v.includes(keyword)) return String(section)
  }

  // 2. Varietal map
  for (const [keyword, section] of VARIETAL_SECTION_MAP) {
    if (v.includes(keyword)) return String(section)
  }

  // 3. Scan actual section labels for varietal words (fallback for custom labels / unknown varietals)
  const varWords = v.split(/[\s,\/&+()\-]+/).filter(w => w.length > 3)
  for (let n = 1; n <= 10; n++) {
    const label = (sectionLabels[n] ?? '').toLowerCase()
    if (varWords.some(w => label.includes(w))) return String(n)
  }

  return null
}

export function computeSectionLabels(wines: Wine[]): Record<number, string> {
  const bySection: Record<number, string[]> = {}

  wines
    .filter(w => w.quantity_remaining > 0)
    .forEach(w => {
      const num = parseInt(w.cellar_section ?? '')
      if (num >= 1 && num <= 10 && w.varietal_blend) {
        if (!bySection[num]) bySection[num] = []
        const primary = w.varietal_blend.split(/[,/&]/)[0].trim().replace(/^\d+%?\s*/, '')
        if (primary) bySection[num].push(primary)
      }
    })

  const labels: Record<number, string> = {}
  for (let i = 1; i <= 10; i++) {
    if (i === 1) { labels[i] = '1 — Champagne & Sparkling'; continue }
    if (i === 5) { labels[i] = '5 — Rosé'; continue }

    const varietals = bySection[i] ?? []
    if (varietals.length === 0) {
      labels[i] = BASE_SECTION_LABELS[i]
    } else {
      const freq: Record<string, number> = {}
      varietals.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k)
      const category = i <= 4 ? 'Whites' : 'Reds'
      labels[i] = `${i} — ${category} (${top.join(', ')})`
    }
  }
  return labels
}
