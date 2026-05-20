import type { DrinkingStatus } from '@/db/schema'

export function computeDrinkingStatus(
  windowStart: number | null | undefined,
  windowEnd: number | null | undefined,
  currentYear = new Date().getFullYear()
): DrinkingStatus {
  if (!windowStart && !windowEnd) return 'unknown'

  // Past-peak checks (only need windowEnd)
  if (windowEnd && currentYear > windowEnd + 3) return 'overdue'
  if (windowEnd && currentYear > windowEnd) return 'past_peak'

  // Both start and end known — can determine peak vs ready
  if (windowStart && windowEnd) {
    const midpoint = Math.floor((windowStart + windowEnd) / 2)
    if (currentYear >= midpoint) return 'peak'
    if (currentYear >= windowStart) return 'ready'
    return 'not_ready'
  }

  // Only windowStart known — can determine ready vs not_ready, but not peak
  if (windowStart) {
    return currentYear >= windowStart ? 'ready' : 'not_ready'
  }

  // Only windowEnd known — wine is before its end; we can't know start
  // Treat as ready (it's within or approaching its window)
  return 'ready'
}

export const DRINKING_STATUS_LABELS: Record<DrinkingStatus, string> = {
  not_ready: 'Not Ready',
  ready: 'Early Peak',
  peak: 'Peak',
  past_peak: 'Past Peak',
  overdue: 'Declining',
  unknown: 'Unknown',
}

export const DRINKING_STATUS_COLORS: Record<DrinkingStatus, string> = {
  not_ready: '',
  ready: '',
  peak: '',
  past_peak: '',
  overdue: '',
  unknown: '',
}

export const DRINKING_STATUS_BADGE_STYLES: Record<DrinkingStatus, { background: string; color: string }> = {
  not_ready: { background: '#1A1C2E', color: '#7A8EC8' },
  ready:     { background: '#182820', color: '#48B888' },
  peak:      { background: '#152A1A', color: '#4DC878' },
  past_peak: { background: '#2C2208', color: '#D09038' },
  overdue:   { background: '#2A1818', color: '#C86868' },
  unknown:   { background: '#1E1E26', color: '#7A7589' },
}
