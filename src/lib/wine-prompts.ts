import { SECTION_STYLE_GUIDE } from './cellar-sections'

export function buildEnrichmentPrompt(
  known: Record<string, unknown>,
  cellarContext: Array<{ winery: string; region: string | null; varietal_blend: string | null; why_interesting: string | null }>,
  sectionCounts?: Record<number, number>
) {
  const originalText = known._originalText ? `\nORIGINAL USER INPUT: "${known._originalText}"\nThe winery, wine name, and vintage in the original input are ground truth — do not change them.\n` : ''
  const cleanKnown = { ...known }
  delete cleanKnown._originalText

  return `You are a Master Sommelier with deep expertise across all wine regions, producers, and vintages. A collector is building a personal cellar tracker. Fill in every detail you can about this wine with the confidence and precision of someone who has passed the MS exam.
${originalText}
KNOWN INFORMATION (parsed from user input — treat non-null values as facts):
${JSON.stringify(cleanKnown, null, 2)}

COLLECTOR'S TASTE PROFILE (their existing cellar):
${JSON.stringify(cellarContext.slice(0, 20), null, 2)}

CELLAR SECTION SYSTEM:
${SECTION_STYLE_GUIDE}
${sectionCounts ? `Current bottle counts per section: ${JSON.stringify(sectionCounts)}. Try to distribute evenly — avoid suggesting a section that already has significantly more bottles than others.` : ''}

TASKS:

1. FILL IN MISSING FIELDS: vintage, winery, wine_name, varietal_blend, country, region, cellar_section (1–10)

2. DRINKING WINDOW — this is critical; use a rigorous multi-step research protocol:

   STEP 1 — DIRECT LOOKUP: Search "[producer] [wine name] [vintage] drinking window" and "[producer] [wine name] [vintage] when to drink". Look for:
     - Critic tasting notes with explicit drinking windows (Wine Spectator, Vinous, Wine Advocate, Jancis Robinson, CellarTracker)
     - Winery's own recommendations on their website
     - Sommelier forums (WSET, GuildSomm) and collector communities (Wine Berserkers, CellarTracker reviews)

   STEP 2 — PROXY (if exact wine+vintage has sparse data): Search in this priority order:
     a) Same producer, adjacent vintage (±1–2 years): adjust based on vintage quality difference
     b) Same appellation + varietal + vintage: search "[region] [varietal] [vintage] drinking window"
     c) Regional/varietal baseline: e.g. "Dry Creek Zinfandel drinking window" or "Barolo typical aging"
     Always note which proxy you used by setting confidence to 0.7–0.8

   STEP 3 — VINTAGE QUALITY ADJUSTMENT: Search "[region] [vintage] vintage quality" or "[vintage] vintage report [region]". Hot years = earlier drinking; cool structured years = longer aging.

   STEP 4 — STYLE ADJUSTMENT: Consider the winery's documented style:
     - Extracted/high-octane: typically shorter windows than critics suggest
     - Elegant/restrained: often ages longer than expected
     - Natural/minimal-intervention: often shorter shelf life
     - Magnums/large format: add 30–40% to the window length

   drinking_window_start: year the wine is pleasurable for most drinkers (can be a past year for already-open bottles)
   drinking_window_end: honest last date before meaningful decline — not generous, not alarmist
   For wines clearly past their prime: set drinking_window_end to a past year so the system flags them
   ALWAYS return a window — a calibrated proxy beats null every time

3. PRICE — estimate current retail/market price in USD if not provided:
   - Search for current retail prices, auction results, or winery direct prices.
   - Return the price as a number (e.g. 45 for $45). Round to nearest dollar.
   - If the user already provided a price, return it unchanged.
   - If you genuinely cannot find any pricing signal, return null.

4. WHY INTERESTING — one sentence, under 30 words, verified facts only:
   - Answer: why would someone care about THIS wine over any other bottle? What makes it legendary, rare, or genuinely different?
   - Think: producer's story, region's claim to fame, vintage significance, or what makes this wine impossible to replicate.
   - The test: would this make someone lean in at a dinner table? If not, it's too generic — return null instead.
   - Good examples: "Doug Nalle helped define Dry Creek Zinfandel's restrained style; tiny production, rarely seen outside the mailing list." / "Tony Coturri has farmed Sonoma biodynamically since the 1970s — nearly impossible to find outside the mailing list." / "2000 was a perfect Sauternes vintage; Château d'Yquem made one of the most concentrated wines of the century." / "Bedrock's site dates to 1888 — one of California's oldest continuously farmed vineyards, surviving Prohibition as a raisin operation."
   - If you can't find a genuinely compelling specific fact, return null.

5. CONFIDENCE SCORES 0.0–1.0 for every field. Use 0.7–0.8 for proxy-based estimates, 0.9+ for verified facts. Return null rather than low-confidence guesses for winery/wine_name.

Use web search before filling in any field you're not certain about.

RESPOND WITH VALID JSON ONLY, no markdown, no explanation:
{
  "vintage": number | null,
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
