'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { logDrank, removeBottle } from '@/actions/drank'
import type { Wine } from '@/db/schema'
import { cn } from '@/lib/utils'

interface Props {
  wine: Wine
  open: boolean
  onClose: () => void
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          className={`text-2xl transition-transform hover:scale-110 ${star <= value ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

type Mode = 'drank' | 'remove'

export function DrankItDialog({ wine, open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('drank')
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [occasion, setOccasion] = useState('')
  const [removeReason, setRemoveReason] = useState('')
  const [dateDrank, setDateDrank] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'drank') {
        await logDrank({
          wine_id: wine.id,
          date_drank: new Date(dateDrank),
          rating: rating || null,
          notes: notes || null,
          occasion: occasion || null,
        })
      } else {
        await removeBottle(wine.id)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{mode === 'drank' ? '🍷' : '📦'}</span>
            <span>{mode === 'drank' ? 'Drank It!' : 'Remove Bottle'}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {wine.vintage && `${wine.vintage} `}{wine.winery} — {wine.wine_name}
          </p>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          <button
            className={cn('flex-1 py-2 transition-colors', mode === 'drank' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            onClick={() => setMode('drank')}
          >
            🍷 Drank It
          </button>
          <button
            className={cn('flex-1 py-2 transition-colors border-l border-border', mode === 'remove' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            onClick={() => setMode('remove')}
          >
            📦 Just Removing
          </button>
        </div>

        {mode === 'drank' ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>How was it? <span className="text-muted-foreground">(optional)</span></Label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={dateDrank} onChange={(e) => setDateDrank(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="occasion">Occasion <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="occasion" placeholder="Birthday dinner, Tuesday couch..." value={occasion} onChange={(e) => setOccasion(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Tasting notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="notes" placeholder="How did it drink? Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Bottle removed with no tasting record — broken, gifted, misplaced, etc.
            </p>
            <div className="space-y-1">
              <Label htmlFor="reason">Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="reason" placeholder="Broke it, gave it away..." value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className={mode === 'drank' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}>
            {saving ? 'Saving...' : mode === 'drank' ? 'Save & Remove from Cellar' : 'Remove Bottle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
