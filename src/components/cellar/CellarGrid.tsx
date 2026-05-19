'use client'

import { useState, useMemo, useRef } from 'react'
import { Wine } from '@/db/schema'
import { computeDrinkingStatus, DRINKING_STATUS_LABELS, DRINKING_STATUS_COLORS } from '@/lib/drinking-status'
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

type SortKey = 'vintage' | 'winery' | 'country' | 'region' | 'drinking_window_start' | 'quantity_remaining' | 'format' | 'status' | 'sticker' | 'price'
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
  }

  const alertCount = wines.filter((w) => {
    const s = computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end)
    return (s === 'past_peak' || s === 'overdue') && w.quantity_remaining > 0
  }).length

  const save = (id: string, field: string) => async (val: string) => {
    const parsed: any = {}
    if (field === 'vintage' || field === 'quantity_remaining' || field === 'quantity_added') {
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
            <SelectItem value="past_peak">Past Peak</SelectItem>
            <SelectItem value="overdue">Declining</SelectItem>
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

        <Select value={filterSticker} onValueChange={setFilterSticker}>
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
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <WineIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {isFiltered ? 'No wines match your filters' : 'Your cellar is empty — add some wines!'}
                  </td>
                </tr>
              )}
              {filtered.map((wine) => {
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
                    <td className="px-3 py-3 font-mono text-muted-foreground" onClick={e => e.stopPropagation()}>
                      {wine.non_vintage
                        ? <span className="text-xs font-semibold">NV</span>
                        : <InlineEdit value={wine.vintage} type="number" onSave={save(wine.id, 'vintage')} />
                      }
                    </td>
                    <td className="px-3 py-3 max-w-0 w-[32%]" onClick={e => e.stopPropagation()}>
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
                    <td className="px-3 py-3 text-muted-foreground" onClick={e => e.stopPropagation()}>
                      <InlineEdit value={wine.country} onSave={save(wine.id, 'country')} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground" onClick={e => e.stopPropagation()}>
                      <InlineEdit value={wine.region} onSave={save(wine.id, 'region')} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <InlineEdit value={wine.format ?? '750ml'} onSave={save(wine.id, 'format')} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', DRINKING_STATUS_COLORS[status])}>
                        {DRINKING_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground" onClick={e => e.stopPropagation()}>
                      <InlineEdit
                        value={wine.price}
                        type="number"
                        onSave={save(wine.id, 'price')}
                        display={wine.price != null ? `$${wine.price % 1 === 0 ? wine.price : wine.price.toFixed(2)}` : undefined}
                      />
                    </td>
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-0.5">
                        <InlineEdit
                          value={wine.quantity_remaining}
                          type="number"
                          onSave={save(wine.id, 'quantity_remaining')}
                          className="font-medium"
                        />
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-rose-500 hover:text-rose-700 leading-none"
                          onClick={() => setDrankWine(wine)}
                        >
                          🍷
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 w-8" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drankWine && (
        <DrankItDialog key={drankWine.id} wine={drankWine} open={true} onClose={() => setDrankWine(null)} />
      )}
      {detailWine && (
        <WineDetailSheet key={detailWine.id} wine={detailWine} open={true} onClose={() => setDetailWine(null)} onDrank={() => { setDetailWine(null); setDrankWine(detailWine) }} />
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
