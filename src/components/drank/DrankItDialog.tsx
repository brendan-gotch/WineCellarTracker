'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { logDrank } from '@/actions/drank'
import type { Wine } from '@/db/schema'

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
          onClick={() => onChange(star)}
          className={`text-2xl transition-transform hover:scale-110 ${star <= value ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function DrankItDialog({ wine, open, onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [occasion, setOccasion] = useState('')
  const [dateDrank, setDateDrank] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await logDrank({
        wine_id: wine.id,
        date_drank: new Date(dateDrank),
        rating: rating || null,
        notes: notes || null,
        occasion: occasion || null,
      })
      onClose()
      setRating(0)
      setNotes('')
      setOccasion('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>🍷</span>
            <span>Drank It!</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {wine.vintage && `${wine.vintage} `}{wine.winery} — {wine.wine_name}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>How was it?</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={dateDrank}
              onChange={(e) => setDateDrank(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="occasion">Occasion <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="occasion"
              placeholder="Birthday dinner, Tuesday couch..."
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="notes"
              placeholder="Tasting notes, thoughts..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
            {saving ? 'Saving...' : 'Save & Remove from Cellar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
