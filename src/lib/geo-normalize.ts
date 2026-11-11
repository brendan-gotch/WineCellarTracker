const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'United States',
  'us': 'United States',
  'u s a': 'United States',
  'america': 'United States',
  'united states of america': 'United States',
  'uk': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'nz': 'New Zealand',
  'rsa': 'South Africa',
}

export function normalizeCountry(country: string | null | undefined): string | null {
  if (!country) return country ?? null
  const trimmed = country.trim()
  if (!trimmed) return null
  const key = trimmed.toLowerCase().replace(/\./g, '')
  return COUNTRY_ALIASES[key] ?? trimmed
}

const APPELLATION_SUFFIX = /\s+(AVA|AOC|AOP|DOC|DOCG|IGT|IGP|DO)$/i

export function normalizeRegion(region: string | null | undefined): string | null {
  if (!region) return region ?? null
  const leading = region.split(',')[0].trim()
  if (!leading) return null
  return leading.replace(APPELLATION_SUFFIX, '').trim()
}
