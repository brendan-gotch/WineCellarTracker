'use client'

import { useState, useMemo, useRef } from 'react'
import { Wine } from '@/db/schema'
import { computeDrinkingStatus, DRINKING_STATUS_LABELS, DRINKING_STATUS_BADGE_STYLES } from '@/lib/drinking-status'
import { DrankItDialog } from '@/components/drank/DrankItDialog'
import { WineDetailSheet } from './WineDetailSheet'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, SortAsc, Wine as WineIcon, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_SECTION_LABELS } from '@/lib/cellar-sections'
import { updateWine } from '@/actions/wines'
import {
  computeStickerColor, STICKER_COLORS, STICKER_YEAR_RANGES,
  STICKER_ORDER, type StickerColor,
} from '@/lib/cellar-stickers'

type SortKey = 'vintage' | 'winery' | 'country' | 'region' | 'cellar_section' | 'drinking_window_start' | 'quantity_remaining' | 'format' | 'status' | 'sticker' | 'price'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<string, number> = { not_ready: 0, ready: 1, peak: 2, past_peak: 3, overdue: 4 }

interface Props {
  wines: Wine[]
  sectionLabels?: Record<number, string>
}

// Generic inline-edit cell — click to edit, Enter/blur to save, Escape to cancel
function InlineEdit({ value, onSave, type = 'text', display, className }: {
  value: string | number | null | undefined
  onSave: (v: string) => Promise<void>
  type?: 'text' | 'number'
  display?: React.ReactNode
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(String(value ?? ''))
    setEditing(true)
  }

  const commit = async () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== String(value ?? '')) await onSave(trimmed)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        className="w-full min-w-[60px] border border-primary rounded px-1 py-0.5 text-sm bg-background focus:outline-none"
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.stopPropagation(); setEditing(false) }
        }}
      />
    )
  }

  return (
    <span
      className={cn('cursor-text rounded px-0.5 -mx-0.5 hover:bg-accent/60 transition-colors', className)}
      title="Click to edit"
      onClick={open}
    >
      {display ?? (value != null && value !== '' ? value : <span className="text-muted-foreground/40">—</span>)}
    </span>
  )
}

export function CellarGrid({ wines, sectionLabels }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterSection, setFilterSection] = useState('all')
  const [filterSticker, setFilterSticker] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('vintage')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [drankWine, setDrankWine] = useState<Wine | null>(null)
  const [detailWine, setDetailWine] = useState<Wine | null>(null)
  const [pageSize, setPageSize] = useState<number | 'all'>(50)
  const [page, setPage] = useState(0)

  const countries = useMemo(() => Array.from(new Set(wines.map((w) => w.country).filter(Boolean))).sort() as string[], [wines])
  const sections = useMemo(() => Array.from(new Set(wines.map((w) => w.cellar_section).filter(Boolean))).sort((a, b) => parseInt(a as string) - parseInt(b as string)) as string[], [wines])

  const filtered = useMemo(() => {
    let list = wines.filter((w) => w.quantity_remaining > 0)

    if (search) {
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
      list = list.filter((w) => {
        const hay = [w.winery, w.wine_name, w.varietal_blend, w.region, w.country, String(w.vintage ?? '')].join(' ').toLowerCase()
        return terms.every(t => hay.includes(t))
      })
    }

    if (filterStatus !== 'all') {
      list = list.filter((w) => computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end) === filterStatus)
    }
    if (filterCountry !== 'all') list = list.filter((w) => w.country === filterCountry)
    if (filterSection !== 'all') list = list.filter((w) => w.cellar_section === filterSection)
    if (filterSticker !== 'all') {
      list = list.filter((w) => computeStickerColor(w.drinking_window_start, w.drinking_window_end) === filterSticker)
    }

    list = [...list].sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'status') {
        av = STATUS_ORDER[computeDrinkingStatus(a.drinking_window_start, a.drinking_window_end)] ?? 0
        bv = STATUS_ORDER[computeDrinkingStatus(b.drinking_window_start, b.drinking_window_end)] ?? 0
      } else if (sortKey === 'sticker') {
        const sa = computeStickerColor(a.drinking_window_start, a.drinking_window_end)
        const sb = computeStickerColor(b.drinking_window_start, b.drinking_window_end)
        av = sa != null ? STICKER_ORDER.indexOf(sa) : 999
        bv = sb != null ? STICKER_ORDER.indexOf(sb) : 999
      } else if (sortKey === 'cellar_section') {
        av = parseInt(a.cellar_section ?? '999')
        bv = parseInt(b.cellar_section ?? '999')
      } else {
        av = a[sortKey as keyof Wine]
        bv = b[sortKey as keyof Wine]
      }
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [wines, search, filterStatus, filterCountry, filterSection, filterSticker, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const paged = pageSize === 'all' ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / pageSize)

  const alertCount = wines.filter((w) => {
    const s = computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end)
    return (s === 'past_peak' || s === 'overdue') && w.quantity_remaining > 0
  }).length

  const save = (id: string, field: string) => async (val: string) => {
    const parsed: any = {}
    if (field === 'vintage') {
      if (val.toUpperCase() === 'NV') {
        parsed.non_vintage = true
        parsed.vintage = null
      } else {
        parsed.non_vintage = false
        const n = parseInt(val)
        parsed.vintage = isNaN(n) ? null : n
      }
    } else if (field === 'quantity_remaining' || field === 'quantity_added') {
      const n = parseInt(val)
      parsed[field] = isNaN(n) ? null : n
    } else if (field === 'price') {
      const n = parseFloat(val)
      parsed[field] = isNaN(n) ? null : n
    } else {
      parsed[field] = val || null
    }
    await updateWine(id, parsed)
  }

  const isFiltered = search || filterStatus !== 'all' || filterCountry !== 'all' || filterSection !== 'all' || filterSticker !== 'all'

  return (
    <div className="space-y-4">
      {alertCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{alertCount}</strong> {alertCount === 1 ? 'wine is' : 'wines are'} past their drinking window — time to pop some corks.</span>
          <button className="ml-auto text-xs underline" onClick={() => setFilterStatus('past_peak')}>Show them</button>
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
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>

        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_ready">Not Ready</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="peak">Peak</SelectItem>
            <SelectItem value="past_peak">Past Peak</SelectItem>
            <SelectItem value="overdue">Declining</SelectItem>
          </SelectContent>
        </Select>

        {countries.length > 0 && (
          <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setPage(0) }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {sections.length > 0 && (
          <Select value={filterSection} onValueChange={(v) => { setFilterSection(v); setPage(0) }}>
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

        <Select value={filterSticker} onValueChange={(v) => { setFilterSticker(v); setPage(0) }}>
          <SelectTrigger className="w-[150px]">
            {filterSticker === 'all'
              ? <span className="text-muted-foreground">Sticker</span>
              : <span className="flex items-center gap-2">
                  <span className={cn('inline-block h-3 w-3 rounded-full', STICKER_COLORS[filterSticker as StickerColor])} />
                  {STICKER_YEAR_RANGES[filterSticker as StickerColor]}
                </span>
            }
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stickers</SelectItem>
            {STICKER_ORDER.map(color => (
              <SelectItem key={color} value={color}>
                <span className="flex items-center gap-2">
                  <span className={cn('inline-block h-3 w-3 rounded-full', STICKER_COLORS[color])} />
                  {STICKER_YEAR_RANGES[color]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sticker legend */}
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-muted-foreground" style={{ fontSize: '11px' }}>
        <span className="font-medium">Sticker:</span>
        {STICKER_ORDER.map(color => (
          <span key={color} className="flex items-center gap-1">
            <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', STICKER_COLORS[color])} />
            <span>{STICKER_YEAR_RANGES[color]}</span>
          </span>
        ))}
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
                <SortHeader label="" sortKey="sticker" current={sortKey} dir={sortDir} onClick={toggleSort} className="w-8 px-3" title="Sort by drinking window" />
                <SortHeader label="Vintage" sortKey="vintage" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Wine" sortKey="winery" current={sortKey} dir={sortDir} onClick={toggleSort} className="w-[32%]" />
                <SortHeader label="Country" sortKey="country" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Region" sortKey="region" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Section" sortKey="cellar_section" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Size" sortKey="format" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Price" sortKey="price" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Qty" sortKey="quantity_remaining" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    <WineIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isFiltered ? 'No wines match your filters' : 'Your cellar is empty — add some wines!'}
                  </td>
                </tr>
              )}
              {paged.map((wine) => {
                const status = computeDrinkingStatus(wine.drinking_window_start, wine.drinking_window_end)
                const sticker = computeStickerColor(wine.drinking_window_start, wine.drinking_window_end)
                return (
                  <tr
                    key={wine.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                    onClick={() => setDetailWine(wine)}
                  >
                    <td className="pl-3 py-3 w-8" onClick={e => e.stopPropagation()}>
                      {sticker ? (
                        <span
                          className={cn('inline-block h-3.5 w-3.5 rounded-full shrink-0', STICKER_COLORS[sticker])}
                          title={`Drink ${STICKER_YEAR_RANGES[sticker]}`}
                        />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 rounded-full bg-border shrink-0" title="No drinking window set" />
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">
                      <InlineEdit
                        value={wine.non_vintage ? 'NV' : (wine.vintage?.toString() ?? '')}
                        type="text"
                        onSave={save(wine.id, 'vintage')}
                      />
                    </td>
                    <td className="px-3 py-3 max-w-0 w-[32%]">
                      <div className="font-medium truncate">
                        <InlineEdit value={wine.winery} onSave={save(wine.id, 'winery')} />
                      </div>
                      <div className="text-muted-foreground text-xs truncate">
                        <InlineEdit
                          value={wine.wine_name}
                          onSave={save(wine.id, 'wine_name')}
                          display={<>{wine.wine_name}{wine.varietal_blend ? ` · ${wine.varietal_blend}` : ''}</>}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <InlineEdit value={wine.country} onSave={save(wine.id, 'country')} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <InlineEdit value={wine.region} onSave={save(wine.id, 'region')} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {wine.cellar_section
                        ? (sectionLabels?.[parseInt(wine.cellar_section)] ?? wine.cellar_section)
                        : <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      <InlineEdit value={wine.format ?? '750ml'} onSave={save(wine.id, 'format')} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {(() => {
                        const s = DRINKING_STATUS_BADGE_STYLES[status]
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: s.background, color: s.color,
                            borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                            padding: '3px 9px', whiteSpace: 'nowrap',
                          }}>
                            {DRINKING_STATUS_LABELS[status]}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <InlineEdit
                        value={wine.price}
                        type="number"
                        onSave={save(wine.id, 'price')}
                        display={wine.price != null ? `$${wine.price % 1 === 0 ? wine.price : wine.price.toFixed(2)}` : undefined}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <InlineEdit
                        value={wine.quantity_remaining}
                        type="number"
                        onSave={save(wine.id, 'quantity_remaining')}
                        className="font-medium"
                      />
                    </td>
                    <td className="px-3 py-3 w-8 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none"
                        title="Drank it"
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
        {/* Table footer: pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <>
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="disabled:opacity-40 hover:text-foreground transition-colors"
                >← Prev</button>
              </>
            )}
            <span>
              {pageSize === 'all'
                ? `Showing all ${filtered.length} wines.`
                : `Showing ${filtered.length === 0 ? 0 : page * (pageSize as number) + 1}–${Math.min((page + 1) * (pageSize as number), filtered.length)} of ${filtered.length} wines.`
              }
            </span>
            {totalPages > 1 && (
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="disabled:opacity-40 hover:text-foreground transition-colors"
              >Next →</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(v === 'all' ? 'all' : Number(v)); setPage(0) }}
            >
              <SelectTrigger className="w-[80px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[50, 100, 200, 500].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {drankWine && (
        <DrankItDialog key={drankWine.id} wine={drankWine} open={true} onClose={() => setDrankWine(null)} />
      )}
      {detailWine && (
        <WineDetailSheet key={detailWine.id} wine={detailWine} open={true} sectionLabels={sectionLabels} onClose={() => setDetailWine(null)} onDrank={() => { setDetailWine(null); setDrankWine(detailWine) }} />
      )}
    </div>
  )
}

function SortHeader({ label, sortKey, current, dir, onClick, className, title }: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onClick: (k: SortKey) => void
  className?: string
  title?: string
}) {
  const active = current === sortKey
  return (
    <th className={cn('text-left px-3 py-2.5 font-medium text-muted-foreground', className)} title={title}>
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
