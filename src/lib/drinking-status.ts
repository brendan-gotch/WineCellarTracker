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
  ready: 'Ready',
  peak: 'Peak',
  past_peak: 'Past Peak',
  overdue: 'Declining',
  unknown: 'Unknown',
}

export const DRINKING_STATUS_COLORS: Record<DrinkingStatus, string> = {
  not_ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  peak: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  past_peak: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
