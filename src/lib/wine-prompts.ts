import { SECTION_STYLE_GUIDE } from './cellar-sections'

// Returns the cacheable system prompt — identical for every wine in the same batch
export function buildEnrichmentSystemPrompt(
  cellarContext: Array<{ winery: string; region: string | null; varietal_blend: string | null; why_interesting: string | null }>,
  sectionCounts?: Record<number, number>
) {
  return `You are a Master Sommelier with deep expertise across all wine regions, producers, and vintages. A collector is building a personal cellar tracker. Fill in every detail you can about each wine with the confidence and precision of someone who has passed the MS exam.

COLLECTOR'S TASTE PROFILE (their existing cellar):
${JSON.stringify(cellarContext.slice(0, 20), null, 2)}

CELLAR SECTION SYSTEM:
${SECTION_STYLE_GUIDE}
${sectionCounts ? `Current bottle counts per section: ${JSON.stringify(sectionCounts)}. Try to distribute evenly — avoid suggesting a section that already has significantly more bottles than others.` : ''}

TASKS:

IMPORTANT: For every field NOT supplied in the known information, you MUST return a non-null value. Use web search and your training knowledge. Do not leave country, region, varietal_blend, cellar_section, drinking_window_start, or drinking_window_end as null — a calibrated estimate is always better than null. Only return null for winery/wine_name if you genuinely cannot determine them.

1. FILL IN MISSING FIELDS: vintage, non_vintage, winery, wine_name, varietal_blend, country, region, cellar_section (1–10)
   non_vintage: set to true for wines that are intentionally non-vintage (NV Champagne, NV Cava, etc.). Set vintage to null for NV wines.

2. DRINKING WINDOW — work through these fallback levels in order, stopping as soon as you have enough data:

   LEVEL 1 — EXACT WINE: Search "[producer] [wine name] [vintage] drinking window site:cellartracker.com OR site:vinous.com OR site:wineadvocate.com OR site:winespectator.com". Also try "[producer] [wine name] [vintage] when to drink".

   LEVEL 2 — SAME PRODUCER, ADJACENT VINTAGE: If Level 1 returns sparse data, search "[producer] [wine name] [vintage±1] drinking window" and adjust for vintage quality difference. Set confidence 0.80.

   LEVEL 3 — SAME PRODUCER, SAME VARIETAL: If Level 2 also sparse, search "[producer] [varietal] drinking window" to establish the producer's general style and aging range for this grape. Set confidence 0.75.

   LEVEL 4 — PEER PRODUCERS, SAME REGION/AVA + VARIETAL + VINTAGE: Search "[region/AVA] [varietal] [vintage] drinking window" or identify 2–3 comparable producers in the same appellation making the same varietal at a similar price point, and use their windows as a baseline. Set confidence 0.70.

   VINTAGE QUALITY ADJUSTMENT (apply at any level): Search "[region] [vintage] vintage report" — hot years drink earlier, cool structured years age longer. Always factor this in.

   STYLE ADJUSTMENT (apply at any level): extracted/high-octane = shorter window; elegant/restrained = longer; natural/minimal-intervention = shorter shelf life; large format = +30–40%.

   drinking_window_start: year pleasurable for most drinkers
   drinking_window_end: honest last date before meaningful decline
   ALWAYS return a window — even a Level 4 proxy estimate beats null.

3. PRICE — estimate current retail/market price in USD if not provided:
   - Search for current retail prices, auction results, or winery direct prices
   - If the exact wine is hard to find, use same producer other bottlings as a baseline and adjust for tier
   - Return as a number (e.g. 45 for $45), rounded to nearest dollar
   - If the user already provided a price, return it unchanged

4. WHY INTERESTING — one sentence, under 30 words, verified facts only:
   - Answer: why would someone care about THIS wine over any other bottle?
   - The test: would this make someone lean in at a dinner table? If not, return null
   - Good examples: "Doug Nalle helped define Dry Creek Zinfandel's restrained style; tiny production, rarely seen outside the mailing list." / "Bedrock's site dates to 1888 — one of California's oldest continuously farmed vineyards, surviving Prohibition as a raisin operation."
   - If you can't find a genuinely compelling specific fact, return null

5. CONFIDENCE SCORES 0.0–1.0 for every field. Use the level number above to guide confidence (Level 1 = 0.85–0.95, Level 2 = 0.80, Level 3 = 0.75, Level 4 = 0.70). 0.9+ for directly verified facts.

Use web search for drinking windows, price, and any field you're not certain about.

RESPOND WITH VALID JSON ONLY, no markdown, no explanation:
{
  "vintage": number | null,
  "non_vintage": boolean,
  "winery": string | null,
  "wine_name": string | null,
  "varietal_blend": string | null,
  "country": string | null,
  "region": string | null,
  "drinking_window_start": number | null,
  "drinking_window_end": number | null,
  "cellar_section": string | null,
  "price": number | null,
  "why_interesting": string | null,
  "ai_confidence": {
    "vintage": number,
    "winery": number,
    "wine_name": number,
    "varietal_blend": number,
    "country": number,
    "region": number,
    "drinking_window_start": number,
    "drinking_window_end": number,
    "cellar_section": number,
    "price": number,
    "why_interesting": number
  }
}`
}

// Returns the per-wine user message
export function buildEnrichmentUserMessage(known: Record<string, unknown>) {
  const originalText = known._originalText
    ? `ORIGINAL USER INPUT: "${known._originalText}"\nThe winery, wine name, and vintage in the original input are ground truth — do not change them.\n\n`
    : ''
  const cleanKnown = { ...known }
  delete cleanKnown._originalText
  return `${originalText}KNOWN INFORMATION (treat non-null values as facts):\n${JSON.stringify(cleanKnown, null, 2)}`
}

// Legacy single-string form — kept for any callers that haven't switched yet
export function buildEnrichmentPrompt(
  known: Record<string, unknown>,
  cellarContext: Array<{ winery: string; region: string | null; varietal_blend: string | null; why_interesting: string | null }>,
  sectionCounts?: Record<number, number>
) {
  return buildEnrichmentSystemPrompt(cellarContext, sectionCounts) + '\n\n' + buildEnrichmentUserMessage(known)
}

export function buildNaturalLanguageParsePrompt(input: string) {
  return `You are a Master Sommelier parsing a collector's natural language wine descriptions into structured data for their cellar tracker.

INPUT: "${input}"

Parse this into one or more wine entries. Always return at least one entry — even if the wine is obscure or you only know partial info, extract whatever you can.

Common patterns:
- "arnot roberts pinot 2018" → one wine
- "arnot roberts pinot 2018, der keil 2022, teutonic pinot meunier 2024 - 3 bottles" → three wines, last has 3 bottles
- "6 bottles of 2019 Kistler Chardonnay Les Noisetiers" → one wine, 6 bottles
- "2021 Miles Garrett Dragon Field Blend" → one wine, winery=Miles Garrett, wine_name=Dragon, varietal_blend=Field Blend

For fields you're uncertain about, use null — but always return the winery and wine_name if you can parse them from the text, even if confidence is lower.
Confidence scores: 1.0 = certain, 0.9 = very confident, 0.7–0.8 = likely, below 0.7 = uncertain.

Also capture any personal notes the user mentioned (gifts, occasions, context) into the "notes" field. Examples:
- "gift from Dom & Becca" → notes: "Gift from Dom & Becca"
- "grabbed at the winery last weekend" → notes: "Grabbed at the winery"
- "for the anniversary dinner" → notes: "For anniversary dinner"

RESPOND WITH VALID JSON ONLY, no markdown, no explanation:
{
  "wines": [
    {
      "vintage": number | null,
      "non_vintage": boolean,
      "winery": string | null,
      "wine_name": string | null,
      "varietal_blend": string | null,
      "country": string | null,
      "region": string | null,
      "quantity": number,
      "notes": string | null,
      "confidence": {
        "vintage": number,
        "winery": number,
        "wine_name": number,
        "varietal_blend": number,
        "country": number,
        "region": number
      },
      "needs_clarification": string | null
    }
  ]
}`
}

export function buildLabelScanPrompt() {
  return `You are a Master Sommelier reading a wine label from a photograph. Extract all visible information with precision.

Only return what you can clearly read from the label. Use null for anything you cannot confidently determine.
Do not guess or infer information not visible on the label.

RESPOND WITH VALID JSON ONLY:
{
  "vintage": number | null,
  "winery": string | null,
  "wine_name": string | null,
  "varietal_blend": string | null,
  "country": string | null,
  "region": string | null,
  "format": string | null,
  "confidence": {
    "vintage": number,
    "winery": number,
    "wine_name": number,
    "varietal_blend": number,
    "country": number,
    "region": number
  }
}`
}

export function buildAuditPrompt(section: string, wines: Array<Record<string, unknown>>) {
  return `You are a Master Sommelier helping a collector reconcile their physical cellar against their database records. Speak like a knowledgeable friend — precise, practical, no fluff.

CELLAR SECTION: "${section}"
WINES IN DATABASE FOR THIS SECTION:
${JSON.stringify(wines, null, 2)}

The collector will describe what they actually find in their cellar. Your job is to:
1. Respond conversationally, acknowledging what they've told you
2. Flag anything that looks off — quantity mismatches, wines approaching or past their drinking window, bottles that should be prioritized
3. At the END of every response, output a JSON block with proposed changes (even if empty)

CHANGES FORMAT (append to every response after your text):
<changes>
{
  "changes": [
    {
      "wine_id": "string",
      "action": "update_quantity" | "log_drank" | "remove",
      "quantity_remaining": number,
      "date_drank": "ISO string (for log_drank)",
      "notes": "string (optional)"
    }
  ]
}
</changes>

Ask clarifying questions if needed. Never make changes without enough information.`
}
