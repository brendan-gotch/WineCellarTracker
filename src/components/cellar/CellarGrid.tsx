'use client'

import { useState, useMemo } from 'react'
import { Wine } from '@/db/schema'
import { computeDrinkingStatus, DRINKING_STATUS_LABELS, DRINKING_STATUS_COLORS } from '@/lib/drinking-status'
import { DrankItDialog } from '@/components/drank/DrankItDialog'
import { WineDetailSheet } from './WineDetailSheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, SortAsc, Wine as WineIcon, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_SECTION_LABELS } from '@/lib/cellar-sections'
import { updateWine } from '@/actions/wines'

type SortKey = 'vintage' | 'winery' | 'country' | 'region' | 'drinking_window_start' | 'quantity_remaining'
type SortDir = 'asc' | 'desc'

interface Props {
  wines: Wine[]
  sectionLabels?: Record<number, string>
}

export function CellarGrid({ wines, sectionLabels }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterSection, setFilterSection] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('vintage')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [drankWine, setDrankWine] = useState<Wine | null>(null)
  const [detailWine, setDetailWine] = useState<Wine | null>(null)

  // Inline quantity editing
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null)
  const [qtyAction, setQtyAction] = useState<'none' | 'decrement'>('none')

  const countries = useMemo(() => Array.from(new Set(wines.map((w) => w.country).filter(Boolean))).sort() as string[], [wines])
  const sections = useMemo(() => Array.from(new Set(wines.map((w) => w.cellar_section).filter(Boolean))).sort() as string[], [wines])

  const filtered = useMemo(() => {
    let list = wines.filter((w) => w.quantity_remaining > 0)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((w) =>
        w.winery.toLowerCase().includes(q) ||
        w.wine_name.toLowerCase().includes(q) ||
        w.varietal_blend?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) ||
        w.country?.toLowerCase().includes(q) ||
        String(w.vintage ?? '').includes(q)
      )
    }

    if (filterStatus === 'needs_drinking') {
      list = list.filter((w) => {
        const s = computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end)
        return s === 'past_peak' || s === 'overdue'
      })
    } else if (filterStatus !== 'all') {
      list = list.filter((w) => computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end) === filterStatus)
    }

    if (filterCountry !== 'all') {
      list = list.filter((w) => w.country === filterCountry)
    }

    if (filterSection !== 'all') {
      list = list.filter((w) => w.cellar_section === filterSection)
    }

    list = [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [wines, search, filterStatus, filterCountry, filterSection, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const alertCount = wines.filter((w) => {
    const s = computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end)
    return (s === 'past_peak' || s === 'overdue') && w.quantity_remaining > 0
  }).length

  const handleIncrementQty = async (wine: Wine) => {
    await updateWine(wine.id, { quantity_remaining: wine.quantity_remaining + 1 })
    setEditingQtyId(null)
    setQtyAction('none')
  }

  const isFiltered = search || filterStatus !== 'all' || filterCountry !== 'all' || filterSection !== 'all'

  return (
    <div className="space-y-4">
      {alertCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{alertCount}</strong> {alertCount === 1 ? 'wine is' : 'wines are'} past their drinking window — time to pop some corks.</span>
          <button className="ml-auto text-xs underline" onClick={() => setFilterStatus('needs_drinking')}>Show them</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search wines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_ready">Not Ready</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="peak">Peak</SelectItem>
            <SelectItem value="needs_drinking">Needs Drinking</SelectItem>
            <SelectItem value="past_peak">Past Peak</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        {countries.length > 0 && (
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {sections.length > 0 && (
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => {
                const num = parseInt(s)
                const label = sectionLabels?.[num] ?? (BASE_SECTION_LABELS[num] ? `${num} — ${BASE_SECTION_LABELS[num]}` : s)
                return <SelectItem key={s} value={s}>{label}</SelectItem>
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'wine' : 'wines'} · {filtered.reduce((s, w) => s + w.quantity_remaining, 0)} bottles
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <SortHeader label="Vintage" sortKey="vintage" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Wine</th>
                <SortHeader label="Country" sortKey="country" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Region" sortKey="region" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <SortHeader label="Qty" sortKey="quantity_remaining" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <WineIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isFiltered ? 'No wines match your filters' : 'Your cellar is empty — add some wines!'}
                  </td>
                </tr>
              )}
              {filtered.map((wine) => {
                const status = computeDrinkingStatus(wine.drinking_window_start, wine.drinking_window_end)
                const isEditingQty = editingQtyId === wine.id
                return (
                  <tr
                    key={wine.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-3 py-3 font-mono text-muted-foreground cursor-pointer" onClick={() => setDetailWine(wine)}>{wine.vintage ?? '—'}</td>
                    <td className="px-3 py-3 cursor-pointer" onClick={() => setDetailWine(wine)}>
                      <div className="font-medium">{wine.winery}</div>
                      <div className="text-muted-foreground text-xs">{wine.wine_name}{wine.varietal_blend ? ` · ${wine.varietal_blend}` : ''}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground cursor-pointer" onClick={() => setDetailWine(wine)}>{wine.country ?? '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground cursor-pointer" onClick={() => setDetailWine(wine)}>{wine.region ?? '—'}</td>
                    <td className="px-3 py-3 cursor-pointer" onClick={() => setDetailWine(wine)}>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', DRINKING_STATUS_COLORS[status])}>
                        {DRINKING_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditingQty ? (
                        <div className="flex flex-col items-center gap-1.5">
                          {qtyAction === 'none' ? (
                            <div className="flex items-center gap-1">
                              <button
                                className="w-6 h-6 rounded border border-border hover:bg-accent text-sm font-bold"
                                onClick={() => setQtyAction('decrement')}
                              >−</button>
                              <span className="w-6 text-center font-medium">{wine.quantity_remaining}</span>
                              <button
                                className="w-6 h-6 rounded border border-border hover:bg-accent text-sm font-bold"
                                onClick={() => handleIncrementQty(wine)}
                              >+</button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                className="text-xs px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50"
                                onClick={() => { setEditingQtyId(null); setQtyAction('none'); setDrankWine(wine) }}
                              >🍷 Drank</button>
                              <button
                                className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent"
                                onClick={() => { setEditingQtyId(null); setQtyAction('none'); setDrankWine(wine) }}
                              >📦 Remove</button>
                            </div>
                          )}
                          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setEditingQtyId(null); setQtyAction('none') }}>cancel</button>
                        </div>
                      ) : (
                        <button
                          className="font-medium hover:text-primary hover:underline"
                          title="Click to adjust quantity"
                          onClick={() => { setEditingQtyId(wine.id); setQtyAction('none') }}
                        >
                          {wine.quantity_remaining}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-lg hover:scale-110 transition-transform"
                        title="Mark as drank"
                        onClick={() => setDrankWine(wine)}
                      >
                        🍷
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* key prop ensures fresh state for each wine */}
      {drankWine && (
        <DrankItDialog key={drankWine.id} wine={drankWine} open={true} onClose={() => setDrankWine(null)} />
      )}
      {detailWine && (
        <WineDetailSheet key={detailWine.id} wine={detailWine} open={true} onClose={() => setDetailWine(null)} onDrank={() => { setDetailWine(null); setDrankWine(detailWine) }} />
      )}
    </div>
  )
}

function SortHeader({ label, sortKey, current, dir, onClick }: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onClick: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
      <button
        className={cn('flex items-center gap-1 hover:text-foreground transition-colors', active && 'text-foreground')}
        onClick={() => onClick(sortKey)}
      >
        {label}
        <SortAsc className={cn('h-3 w-3', active && dir === 'desc' && 'rotate-180', !active && 'opacity-30')} />
      </button>
    </th>
  )
}
