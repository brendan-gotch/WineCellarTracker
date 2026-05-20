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
  not_ready: { background: 'var(--badge-not-ready-bg)',   color: 'var(--badge-not-ready-text)' },
  ready:     { background: 'var(--badge-early-peak-bg)',  color: 'var(--badge-early-peak-text)' },
  peak:      { background: 'var(--badge-peak-bg)',        color: 'var(--badge-peak-text)' },
  past_peak: { background: 'var(--badge-past-peak-bg)',   color: 'var(--badge-past-peak-text)' },
  overdue:   { background: 'var(--badge-declining-bg)',   color: 'var(--badge-declining-text)' },
  unknown:   { background: 'var(--badge-unknown-bg)',     color: 'var(--badge-unknown-text)' },
}
