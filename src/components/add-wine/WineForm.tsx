'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BOTTLE_FORMATS } from '@/db/schema'
import type { Wine } from '@/db/schema'
import { cn } from '@/lib/utils'

type WineFormData = Partial<Omit<Wine, 'id' | 'created_at' | 'updated_at' | 'last_verified'>> & {
  winery: string
  wine_name: string
}

interface Props {
  initial?: Partial<WineFormData>
  aiConfidence?: Record<string, number>
  onSubmit: (data: WineFormData) => Promise<void>
  submitLabel?: string
}

function ConfidenceHint({ field, confidence }: { field: string; confidence?: Record<string, number> }) {
  if (!confidence || confidence[field] === undefined || confidence[field] >= 0.9) return null
  const pct = Math.round((confidence[field] ?? 0) * 100)
  return (
    <span className="ml-1 text-xs text-amber-600 dark:text-amber-400" title={`AI confidence: ${pct}%`}>
      ~{pct}% confident
    </span>
  )
}

export function WineForm({ initial = {}, aiConfidence, onSubmit, submitLabel = 'Save Wine' }: Props) {
  const [form, setForm] = useState<WineFormData>({
    winery: '',
    wine_name: '',
    vintage: undefined,
    varietal_blend: '',
    country: '',
    region: '',
    format: '750ml',
    quantity_added: 1,
    quantity_remaining: 1,
    cellar_section: '',
    drinking_window_start: undefined,
    drinking_window_end: undefined,
    priority: 'medium',
    notes: '',
    why_interesting: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)

  const set = (field: keyof WineFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label>
            Winery / Estate <span className="text-destructive">*</span>
            <ConfidenceHint field="winery" confidence={aiConfidence} />
          </Label>
          <Input required value={form.winery} onChange={(e) => set('winery', e.target.value)} placeholder="Arnot-Roberts" />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label>
            Wine / Cuvée <span className="text-destructive">*</span>
            <ConfidenceHint field="wine_name" confidence={aiConfidence} />
          </Label>
          <Input required value={form.wine_name} onChange={(e) => set('wine_name', e.target.value)} placeholder="Sonoma Coast Pinot Noir" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>
            Vintage
            <ConfidenceHint field="vintage" confidence={aiConfidence} />
          </Label>
          <Input type="number" min={1900} max={2099} value={form.vintage ?? ''} onChange={(e) => set('vintage', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2021" />
        </div>
        <div className="space-y-1">
          <Label>Format</Label>
          <Select value={form.format ?? '750ml'} onValueChange={(v) => set('format', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BOTTLE_FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Quantity</Label>
          <Input type="number" min={1} value={form.quantity_added ?? 1} onChange={(e) => {
            const q = parseInt(e.target.value) || 1
            set('quantity_added', q)
            set('quantity_remaining', q)
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>
            Varietal / Blend
            <ConfidenceHint field="varietal_blend" confidence={aiConfidence} />
          </Label>
          <Input value={form.varietal_blend ?? ''} onChange={(e) => set('varietal_blend', e.target.value)} placeholder="Pinot Noir" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>
            Country
            <ConfidenceHint field="country" confidence={aiConfidence} />
          </Label>
          <Input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} placeholder="USA" />
        </div>
        <div className="space-y-1">
          <Label>
            Region / AVA
            <ConfidenceHint field="region" confidence={aiConfidence} />
          </Label>
          <Input value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} placeholder="Sonoma Coast" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>
            Drink From
            <ConfidenceHint field="drinking_window_start" confidence={aiConfidence} />
          </Label>
          <Input type="number" min={2000} max={2099} value={form.drinking_window_start ?? ''} onChange={(e) => set('drinking_window_start', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2024" />
        </div>
        <div className="space-y-1">
          <Label>
            Drink Through
            <ConfidenceHint field="drinking_window_end" confidence={aiConfidence} />
          </Label>
          <Input type="number" min={2000} max={2099} value={form.drinking_window_end ?? ''} onChange={(e) => set('drinking_window_end', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2030" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Cellar Section</Label>
        <Input value={form.cellar_section ?? ''} onChange={(e) => set('cellar_section', e.target.value)} placeholder="Rack A, Row 3" />
      </div>

      <div className="space-y-1">
        <Label>
          Why Interesting
          <ConfidenceHint field="why_interesting" confidence={aiConfidence} />
        </Label>
        <Textarea
          value={form.why_interesting ?? ''}
          onChange={(e) => set('why_interesting', e.target.value)}
          placeholder="What makes this wine worth having..."
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Personal notes..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
