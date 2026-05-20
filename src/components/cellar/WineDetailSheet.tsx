'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WineForm } from '@/components/add-wine/WineForm'
import { updateWine, deleteWine } from '@/actions/wines'
import { DrinkingStatusBadge } from './DrinkingStatusBadge'
import type { Wine } from '@/db/schema'
import { computeStickerColor, STICKER_COLORS, STICKER_YEAR_RANGES } from '@/lib/cellar-stickers'
import { cn } from '@/lib/utils'
import { apiHeaders } from '@/lib/api-auth'
import { RefreshCw } from 'lucide-react'

interface Props {
  wine: Wine
  open: boolean
  onClose: () => void
  onDrank: () => void
  sectionLabels?: Record<number, string>
}

export function WineDetailSheet({ wine, open, onClose, onDrank, sectionLabels }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [refreshingFact, setRefreshingFact] = useState(false)
  const [localFact, setLocalFact] = useState<string | null | undefined>(undefined)

  const displayFact = localFact !== undefined ? localFact : wine.why_interesting

  const refreshFact = async () => {
    setRefreshingFact(true)
    try {
      const res = await fetch('/api/enrich-wine', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ ...wine, _refreshFact: true }),
      })
      const data = await res.json()
      if (data.why_interesting) {
        setLocalFact(data.why_interesting)
        await updateWine(wine.id, { why_interesting: data.why_interesting })
      }
    } finally {
      setRefreshingFact(false)
    }
  }

  const handleUpdate = async (data: any) => {
    await updateWine(wine.id, data)
    setEditing(false)
    onClose()
  }

  const handleDelete = async () => {
    await deleteWine(wine.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>{(wine.non_vintage ?? false) ? 'NV ' : wine.vintage ? `${wine.vintage} ` : ''}{wine.winery}</span>
            <div className="flex items-center gap-2">
              {(() => {
                const sticker = computeStickerColor(wine.drinking_window_start, wine.drinking_window_end)
                return sticker ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('inline-block h-3 w-3 rounded-full', STICKER_COLORS[sticker])} />
                    {STICKER_YEAR_RANGES[sticker]}
                  </span>
                ) : null
              })()}
              <DrinkingStatusBadge windowStart={wine.drinking_window_start} windowEnd={wine.drinking_window_end} />
            </div>
          </DialogTitle>
          <p className="text-muted-foreground">{wine.wine_name}</p>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Detail label="Varietal / Blend" value={wine.varietal_blend} />
              <Detail label="Country" value={wine.country} />
              <Detail label="Region" value={wine.region} />
              <Detail label="Format" value={wine.format ?? '750ml'} />
              <Detail label="Bottles Remaining" value={`${wine.quantity_remaining} of ${wine.quantity_added}`} />
              <Detail label="Cellar Section" value={wine.cellar_section ? (sectionLabels?.[parseInt(wine.cellar_section)] ?? wine.cellar_section) : null} />
              <Detail label="Drinking Window" value={wine.drinking_window_start ? `${wine.drinking_window_start}–${wine.drinking_window_end ?? '?'}` : null} />
              <Detail label="Price" value={wine.price != null ? `$${wine.price % 1 === 0 ? wine.price : wine.price.toFixed(2)}` : null} />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-amber-800 dark:text-amber-200">✨ Why interesting</div>
                <button
                  onClick={refreshFact}
                  disabled={refreshingFact}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 disabled:opacity-40 transition-colors"
                  title="Refresh this fact"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshingFact && 'animate-spin')} />
                </button>
              </div>
              {displayFact
                ? <p className="text-amber-700 dark:text-amber-300">{displayFact}</p>
                : <p className="text-amber-600/60 dark:text-amber-400/60 italic">No interesting fact yet — click ↻ to generate one.</p>
              }
            </div>

            {wine.notes && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                <p className="text-sm">{wine.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={onDrank} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white">
                🍷 Drank It
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              {!confirmDelete ? (
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
              ) : (
                <Button variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-2">
            <WineForm
              initial={wine as any}
              aiConfidence={wine.ai_confidence ?? undefined}
              isEditMode={true}
              sectionLabels={sectionLabels}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
            />
            <Button variant="ghost" className="w-full mt-2" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  )
}
