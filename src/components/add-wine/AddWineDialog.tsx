'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WineForm } from './WineForm'
import { createWine } from '@/actions/wines'
import { Camera, PenLine, MessageSquare, Loader2, AlertCircle } from 'lucide-react'

type Mode = 'choose' | 'manual' | 'scan' | 'natural'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddWineDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [naturalText, setNaturalText] = useState('')
  const [parsedWines, setParsedWines] = useState<any[]>([])
  const [parsing, setParsing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<any>(null)
  const [enrichedData, setEnrichedData] = useState<any>(null)
  const [enriching, setEnriching] = useState(false)
  const [parseError, setParseError] = useState('')
  const [currentParsedIndex, setCurrentParsedIndex] = useState(0)

  const reset = () => {
    setMode('choose')
    setNaturalText('')
    setParsedWines([])
    setScannedData(null)
    setEnrichedData(null)
    setParseError('')
    setCurrentParsedIndex(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleNaturalParse = async () => {
    if (!naturalText.trim()) return
    setParsing(true)
    setParseError('')
    try {
      const res = await fetch('/api/parse-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: naturalText }),
      })
      const data = await res.json()
      if (data.wines?.length) {
        setParsedWines(data.wines)
        setCurrentParsedIndex(0)
        // Auto-enrich the first wine
        await enrichWine(data.wines[0], 0, naturalText)
      } else {
        setParseError('Could not parse any wines from that description. Try being more specific.')
      }
    } catch {
      setParseError('Something went wrong. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  const enrichWine = async (wineData: any, index: number, originalText?: string) => {
    setEnriching(true)
    try {
      const res = await fetch('/api/enrich-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wineData, _originalText: originalText }),
      })
      const enriched = await res.json()
      // Parsed values always win — enrichment only fills in nulls
      const merged: Record<string, unknown> = {}
      const allKeys = Array.from(new Set([...Object.keys(wineData), ...Object.keys(enriched)]))
      for (const key of allKeys) {
        merged[key] = (wineData[key] !== null && wineData[key] !== undefined) ? wineData[key] : enriched[key]
      }
      setEnrichedData({ ...merged, index })
    } finally {
      setEnriching(false)
    }
  }

  const handleLabelScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const res = await fetch('/api/scan-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType: file.type }),
        })
        const data = await res.json()
        setScannedData(data)
        setMode('scan')
        // Auto-enrich
        await enrichWine(data, -1)
      }
      reader.readAsDataURL(file)
    } catch {
      setParseError('Label scan failed. Try manual entry.')
    } finally {
      setScanning(false)
    }
  }

  const handleSaveWine = async (formData: any) => {
    await createWine({
      ...formData,
      ai_confidence: enrichedData?.ai_confidence ?? null,
    })
    // If there are more parsed wines, move to next
    if (parsedWines.length > 1 && currentParsedIndex < parsedWines.length - 1) {
      const nextIndex = currentParsedIndex + 1
      setCurrentParsedIndex(nextIndex)
      await enrichWine(parsedWines[nextIndex], nextIndex)
    } else {
      handleClose()
    }
  }

  const currentInitial = enrichedData ?? scannedData ?? {}

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'choose' && 'Add Wine'}
            {mode === 'manual' && 'Add Wine Manually'}
            {mode === 'natural' && (parsedWines.length > 1 ? `Adding Wine ${currentParsedIndex + 1} of ${parsedWines.length}` : 'Add Wine')}
            {mode === 'scan' && 'Label Scanned'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => setMode('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left"
            >
              <PenLine className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Manual Entry</div>
                <div className="text-sm text-muted-foreground">Fill in details yourself, Claude fills what's missing</div>
              </div>
            </button>

            <label className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
              <Camera className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Scan Label</div>
                <div className="text-sm text-muted-foreground">Take a photo, Claude reads the label</div>
              </div>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLabelScan} />
              {scanning && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </label>

            <button
              onClick={() => setMode('natural')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left"
            >
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Just Type It</div>
                <div className="text-sm text-muted-foreground">"Arnot Roberts Pinot 2021, 3 bottles of DRC 2018..."</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'natural' && parsedWines.length === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Describe one or more wines naturally. Claude will parse and fill in the details.
            </p>
            <Textarea
              placeholder="Arnot Roberts Pinot 2021, 3 bottles of DRC La Tâche 2015, Teutonic Pinot Meunier 2022..."
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              rows={4}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNaturalParse()
              }}
            />
            {parseError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {parseError}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('choose')}>Back</Button>
              <Button onClick={handleNaturalParse} disabled={parsing || !naturalText.trim()} className="flex-1">
                {parsing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Parsing...</> : 'Parse Wines →'}
              </Button>
            </div>
          </div>
        )}

        {(mode === 'manual' || (mode === 'natural' && parsedWines.length > 0) || mode === 'scan') && (
          <div className="py-2">
            {enriching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                Claude is filling in the details...
              </div>
            )}
            {!enriching && enrichedData?.why_interesting && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-200">✨ Why interesting: </span>
                <span className="text-amber-700 dark:text-amber-300">{enrichedData.why_interesting}</span>
              </div>
            )}
            <WineForm
              initial={currentInitial}
              aiConfidence={enrichedData?.ai_confidence}
              onSubmit={handleSaveWine}
              submitLabel={parsedWines.length > 1 && currentParsedIndex < parsedWines.length - 1
                ? `Save & Add Next (${currentParsedIndex + 2}/${parsedWines.length})`
                : 'Save Wine'}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
