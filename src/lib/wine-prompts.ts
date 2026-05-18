export function buildEnrichmentPrompt(
  known: Record<string, unknown>,
  cellarContext: Array<{ winery: string; region: string | null; varietal_blend: string | null; why_interesting: string | null }>
) {
  return `You are a world-class sommelier and wine expert. A user is building a wine cellar tracker and needs you to fill in missing details about a wine and write a "why interesting" note.

KNOWN INFORMATION:
${JSON.stringify(known, null, 2)}

USER'S CELLAR CONTEXT (their taste profile):
${JSON.stringify(cellarContext.slice(0, 20), null, 2)}

TASK:
1. Fill in any missing fields from: vintage, winery, wine_name, varietal_blend, country, region, drinking_window_start, drinking_window_end
2. Write a 2-3 sentence "why_interesting" about why this wine matters / why someone should care about it. Be specific and compelling, not generic.
3. For each field you fill in, provide a confidence score 0.0-1.0.
4. If you're not confident about something, return null rather than guessing.

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

Parse this into one or more wine entries. Common patterns:
- "arnot roberts pinot 2018" → one wine
- "arnot roberts pinot 2018, der keil 2022, teutonic pinot meunier 2024 - 3 bottles" → three wines, last has 3 bottles
- "6 bottles of 2019 Kistler Chardonnay Les Noisetiers" → one wine, 6 bottles

For each wine, return what you know with high confidence. Use null for anything uncertain.
Confidence scores: 1.0 = certain, 0.9 = very confident, 0.7-0.8 = likely, below 0.7 = uncertain (use null instead).

RESPOND WITH VALID JSON ONLY:
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
