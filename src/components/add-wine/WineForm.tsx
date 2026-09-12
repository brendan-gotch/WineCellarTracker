'use client'

import { useState, useEffect, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BOTTLE_FORMATS } from '@/db/schema'
import type { Wine } from '@/db/schema'
import { SECTION_COUNT, BASE_SECTION_LABELS } from '@/lib/cellar-sections'

type WineFormData = Partial<Omit<Wine, 'id' | 'created_at' | 'updated_at' | 'last_verified' | 'priority'>> & {
  winery: string
  wine_name: string
}

interface Props {
  initial?: Partial<WineFormData>
  aiConfidence?: Record<string, number>
  enrichSupplement?: Record<string, unknown> | null
  sectionLabels?: Record<number, string>
  isEditMode?: boolean
  onSubmit: (data: WineFormData) => Promise<void>
  submitLabel?: string
  submitDisabled?: boolean
  submitDisabledLabel?: string
}

function ConfidenceHint({ field, confidence }: { field: string; confidence?: Record<string, number> }) {
  if (!confidence || confidence[field] === undefined || confidence[field] >= 0.9) return null
  const score = confidence[field] ?? 0
  const label = score >= 0.6 ? 'medium confidence' : 'low confidence'
  const color = score >= 0.6 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
  return <span className={`ml-1 text-xs ${color}`}>{label}</span>
}

export function WineForm({ initial = {}, aiConfidence, enrichSupplement, sectionLabels, isEditMode = false, onSubmit, submitLabel = 'Save Wine', submitDisabled = false, submitDisabledLabel }: Props) {
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
    price: undefined,
    notes: '',
    why_interesting: '',
    perfect_pairing: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const supplementApplied = useRef(false)

  // When background enrichment arrives, fill in fields that are still empty
  useEffect(() => {
    if (!enrichSupplement || supplementApplied.current) return
    supplementApplied.current = true
    setForm(prev => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(enrichSupplement)) {
        if (k === 'ai_confidence' || k === 'confidence') continue
        const key = k as keyof WineFormData
        const current = (prev as any)[key]
        if (current === null || current === undefined || current === '' || current === 0) {
          (next as any)[key] = v
        }
      }
      return next
    })
  }, [enrichSupplement])

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

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>
            Vintage
            <ConfidenceHint field="vintage" confidence={aiConfidence} />
          </Label>
          {form.non_vintage ? (
            <div className="flex items-center gap-2 h-10">
              <span className="font-mono text-sm font-medium">NV</span>
              <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { set('non_vintage', false) }}>clear</button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Input type="number" min={1900} max={2099} value={form.vintage ?? ''} onChange={(e) => set('vintage', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2021" />
              <button type="button" className="px-2 text-xs border border-input rounded-md hover:bg-accent whitespace-nowrap" onClick={() => { set('non_vintage', true); set('vintage', undefined) }}>NV</button>
            </div>
          )}
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
          <Label>{isEditMode ? 'Purchased' : 'Qty'}</Label>
          <Input type="number" min={1} value={form.quantity_added ?? 1} onChange={(e) => {
            const q = parseInt(e.target.value) || 1
            set('quantity_added', q)
            if (!isEditMode) set('quantity_remaining', q)
          }} />
        </div>
        {isEditMode ? (
          <div className="space-y-1">
            <Label>In Cellar</Label>
            <Input type="number" min={0} value={form.quantity_remaining ?? 0} onChange={(e) => set('quantity_remaining', parseInt(e.target.value) || 0)} />
          </div>
        ) : (
          <div className="space-y-1">
            <Label>
              Price
              <ConfidenceHint field="price" confidence={aiConfidence} />
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min={0}
                step={1}
                className="pl-6"
                value={form.price ?? ''}
                onChange={(e) => set('price', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="45"
              />
            </div>
          </div>
        )}
      </div>

      {isEditMode && (
        <div className="space-y-1 w-1/2 pr-1.5">
          <Label>
            Price
            <ConfidenceHint field="price" confidence={aiConfidence} />
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min={0}
              step={1}
              className="pl-6"
              value={form.price ?? ''}
              onChange={(e) => set('price', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="45"
            />
          </div>
        </div>
      )}

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
          <Input type="number" min={1900} max={2099} value={form.drinking_window_start ?? ''} onChange={(e) => set('drinking_window_start', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2024" />
        </div>
        <div className="space-y-1">
          <Label>
            Drink Through
            <ConfidenceHint field="drinking_window_end" confidence={aiConfidence} />
          </Label>
          <Input type="number" min={1900} max={2099} value={form.drinking_window_end ?? ''} onChange={(e) => set('drinking_window_end', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="2030" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>
          Cellar Section
          <ConfidenceHint field="cellar_section" confidence={aiConfidence} />
        </Label>
        <Select
          value={form.cellar_section ?? ''}
          onValueChange={(v) => set('cellar_section', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select section..." />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {sectionLabels?.[n] ?? BASE_SECTION_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label>
          Perfect Pairing
          <ConfidenceHint field="perfect_pairing" confidence={aiConfidence} />
        </Label>
        <Input
          value={form.perfect_pairing ?? ''}
          onChange={(e) => set('perfect_pairing', e.target.value)}
          placeholder="The single best food pairing..."
        />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Personal notes, gifted by, occasion..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={saving || submitDisabled} className="w-full">
        {saving ? 'Saving...' : submitDisabled ? (submitDisabledLabel ?? 'Waiting for details...') : submitLabel}
      </Button>
    </form>
  )
}
