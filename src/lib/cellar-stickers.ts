// Sticker color system — matches the physical colored stickers in the cellar.
// Color is determined by the optimal drinking year (midpoint of window).

export type StickerColor = 'red' | 'orange' | 'yellow' | 'green' | 'light_blue' | 'dark_blue' | 'purple' | 'magenta'

export const STICKER_YEAR_RANGES: Record<StickerColor, string> = {
  red:        '2025–2026',
  orange:     '2027–2028',
  yellow:     '2029–2030',
  green:      '2031–2032',
  light_blue: '2033–2034',
  dark_blue:  '2035–2036',
  purple:     '2037–2038',
  magenta:    '2039+',
}

export const STICKER_COLORS: Record<StickerColor, string> = {
  red:        'bg-red-500',
  orange:     'bg-orange-500',
  yellow:     'bg-yellow-400',
  green:      'bg-green-500',
  light_blue: 'bg-sky-400',
  dark_blue:  'bg-blue-700',
  purple:     'bg-purple-600',
  magenta:    'bg-fuchsia-500',
}

export const STICKER_BORDER_COLORS: Record<StickerColor, string> = {
  red:        'border-red-500',
  orange:     'border-orange-500',
  yellow:     'border-yellow-400',
  green:      'border-green-500',
  light_blue: 'border-sky-400',
  dark_blue:  'border-blue-700',
  purple:     'border-purple-600',
  magenta:    'border-fuchsia-500',
}

export const STICKER_ORDER: StickerColor[] = [
  'red', 'orange', 'yellow', 'green', 'light_blue', 'dark_blue', 'purple', 'magenta',
]

export function computeOptimalYear(
  windowStart: number | null | undefined,
  windowEnd: number | null | undefined,
): number | null {
  if (!windowStart && !windowEnd) return null
  if (windowStart && windowEnd) {
    const midpoint = Math.floor((windowStart + windowEnd) / 2)
    return midpoint - 3
  }
  if (windowStart) return windowStart
  return windowEnd!
}

export function computeStickerColor(
  windowStart: number | null | undefined,
  windowEnd: number | null | undefined,
): StickerColor | null {
  const year = computeOptimalYear(windowStart, windowEnd)
  if (year === null) return null
  if (year <= 2026) return 'red'
  if (year <= 2028) return 'orange'
  if (year <= 2030) return 'yellow'
  if (year <= 2032) return 'green'
  if (year <= 2034) return 'light_blue'
  if (year <= 2036) return 'dark_blue'
  if (year <= 2038) return 'purple'
  return 'magenta'
}
