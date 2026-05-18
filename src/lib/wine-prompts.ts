export function buildEnrichmentPrompt(
  known: Record<string, unknown>,
  cellarContext: Array<{ winery: string; region: string | null; varietal_blend: string | null; why_interesting: string | null }>
) {
  const originalText = known._originalText ? `\nORIGINAL USER INPUT: "${known._originalText}"\nThe winery, wine name, and vintage in the original input are ground truth — do not change them.\n` : ''
  const cleanKnown = { ...known }
  delete cleanKnown._originalText

  return `You are a world-class sommelier and wine expert. A user is building a wine cellar tracker and needs you to fill in missing details about a wine and write a "why interesting" note.
${originalText}
KNOWN INFORMATION (parsed from user input — treat non-null values as facts):
${JSON.stringify(cleanKnown, null, 2)}

USER'S CELLAR CONTEXT (their taste profile):
${JSON.stringify(cellarContext.slice(0, 20), null, 2)}

TASK:
1. Fill in any missing fields from: vintage, winery, wine_name, varietal_blend, country, region, drinking_window_start, drinking_window_end
2. Write a "why_interesting" — maximum 2 sentences, ideally 1. Under 30 words total. Only verified facts — no speculation, no generic praise. One sharp, specific detail is better than three vague ones. Good examples: "Doug Nalle helped define Dry Creek Zinfandel's restrained style; tiny production, rarely seen outside the mailing list." / "Tony Coturri has farmed Sonoma biodynamically since the 1970s — production is tiny and nearly impossible to find." / "2000 was a perfect Sauternes vintage; d'Yquem made one of the most concentrated wines of the century." If you can't find a genuinely interesting specific fact, return null.
3. For each field you fill in, provide a confidence score 0.0-1.0.
4. If you're not confident about something, return null rather than guessing.
5. Use web search to verify facts before writing why_interesting.

Use web search to look up any wines you're not certain about before filling in fields.

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
    "why_interesting": number
  }
}`
}

export function buildNaturalLanguageParsePrompt(input: string) {
  return `You are a wine expert parsing natural language wine descriptions into structured data for a cellar tracker.

INPUT: "${input}"

Parse this into one or more wine entries. Always return at least one entry — even if the wine is obscure or you only know partial info, extract whatever you can.

Common patterns:
- "arnot roberts pinot 2018" → one wine
- "arnot roberts pinot 2018, der keil 2022, teutonic pinot meunier 2024 - 3 bottles" → three wines, last has 3 bottles
- "6 bottles of 2019 Kistler Chardonnay Les Noisetiers" → one wine, 6 bottles
- "2021 Miles Garrett Dragon Field Blend" → one wine, winery=Miles Garrett, wine_name=Dragon, varietal_blend=Field Blend

For fields you're uncertain about, use null — but always return the winery and wine_name if you can parse them from the text, even if confidence is lower.
Confidence scores: 1.0 = certain, 0.9 = very confident, 0.7-0.8 = likely, below 0.7 = uncertain.

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
  return `You are a wine expert reading a wine label from a photograph. Extract all visible information with high accuracy.

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
  return `You are helping a wine collector reconcile their physical cellar against their database records.

CELLAR SECTION: "${section}"
WINES IN DATABASE FOR THIS SECTION:
${JSON.stringify(wines, null, 2)}

The user will describe what they actually find in their cellar. Your job is to:
1. Respond conversationally, acknowledging what they've told you
2. At the END of every response, output a JSON block with proposed changes (even if empty)

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

Be helpful and conversational. Ask clarifying questions if needed. Never make changes without enough information.`
}
