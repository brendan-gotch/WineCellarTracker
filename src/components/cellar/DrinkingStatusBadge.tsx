import { computeDrinkingStatus, DRINKING_STATUS_LABELS, DRINKING_STATUS_COLORS } from '@/lib/drinking-status'
import { cn } from '@/lib/utils'

interface Props {
  windowStart: number | null | undefined
  windowEnd: number | null | undefined
  className?: string
}

export function DrinkingStatusBadge({ windowStart, windowEnd, className }: Props) {
  const status = computeDrinkingStatus(windowStart, windowEnd)
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', DRINKING_STATUS_COLORS[status], className)}>
      {DRINKING_STATUS_LABELS[status]}
    </span>
  )
}
