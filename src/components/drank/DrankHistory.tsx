'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, SortAsc, Wine as WineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDrankHistory } from '@/actions/drank'

type DrankEntry = Awaited<ReturnType<typeof getDrankHistory>>[number]
type SortDir = 'asc' | 'desc'

interface Props { history: DrankEntry[] }

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground/40 text-xs">—</span>
  return (
    <span className="text-amber-400 text-sm tracking-tight whitespace-nowrap">
      {'★'.repeat(rating)}
      <span className="text-gray-300 dark:text-gray-700">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export function DrankHistory({ history }: Props) {
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let list = history
    if (search.trim()) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
      list = list.filter((e) => {
        const hay = [
          e.winery, e.wine_name, e.varietal_blend, e.country, e.region,
          e.occasion, e.notes, String(e.vintage ?? ''),
        ].join(' ').toLowerCase()
        return terms.every(t => hay.includes(t))
      })
    }
    return [...list].sort((a, b) => {
      const cmp = a.date_drank.getTime() - b.date_drank.getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [history, search, sortDir])

  const totalDrunk = history.length
  const avgRating = (() => {
    const rated = history.filter(e => e.rating != null)
    if (!rated.length) return null
    return rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length
  })()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Drank History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalDrunk} bottle{totalDrunk === 1 ? '' : 's'} drunk
          {avgRating != null && <> · avg rating {avgRating.toFixed(1)} ★</>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by wine, varietal, region, occasion, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <SortAsc className={cn('h-4 w-4', sortDir === 'desc' && 'rotate-180')} />
          Date {sortDir === 'desc' ? 'newest first' : 'oldest first'}
        </button>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <WineIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {history.length === 0 ? "You haven't logged any drunk wines yet." : 'No entries match your search.'}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((e) => (
              <div key={e.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {e.non_vintage ? 'NV ' : e.vintage ? `${e.vintage} ` : ''}{e.winery}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {e.wine_name}{e.varietal_blend ? ` · ${e.varietal_blend}` : ''}
                    </div>
                    {(e.country || e.region) && (
                      <div className="text-xs text-muted-foreground/70 truncate">
                        {[e.region, e.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {e.date_drank.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="mt-1"><Stars rating={e.rating != null ? Math.round(e.rating) : null} /></div>
                  </div>
                </div>
                {(e.occasion || e.notes) && (
                  <div className="mt-2 text-sm space-y-0.5">
                    {e.occasion && <div className="text-muted-foreground">🎉 {e.occasion}</div>}
                    {e.notes && <div className="text-foreground/80">{e.notes}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
