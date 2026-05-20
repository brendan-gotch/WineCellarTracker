import { computeDrinkingStatus, DRINKING_STATUS_LABELS, DRINKING_STATUS_BADGE_STYLES } from '@/lib/drinking-status'

interface Props {
  windowStart: number | null | undefined
  windowEnd: number | null | undefined
  className?: string
}

export function DrinkingStatusBadge({ windowStart, windowEnd, className }: Props) {
  const status = computeDrinkingStatus(windowStart, windowEnd)
  const s = DRINKING_STATUS_BADGE_STYLES[status]
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: s.background,
        color: s.color,
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 500,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {DRINKING_STATUS_LABELS[status]}
    </span>
  )
}
