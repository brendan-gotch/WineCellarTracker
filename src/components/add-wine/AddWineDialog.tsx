'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WineForm } from './WineForm'
import { createWine } from '@/actions/wines'
import type { Wine } from '@/db/schema'
import { apiHeaders } from '@/lib/api-auth'
import { Camera, PenLine, MessageSquare, Loader2, AlertCircle, ChevronDown, ChevronUp, Check } from 'lucide-react'

type Mode = 'choose' | 'manual' | 'scan' | 'natural'

interface Props {
  open: boolean
  onClose: () => void
  sectionLabels?: Record<number, string>
  existingWines?: Wine[]
}

interface WineEntry {
  id: string
  parsed: any
  enriched: any | null
  enriching: boolean
  formData: any
  expanded: boolean
  saved: boolean
  duplicate: Wine | null
}

function findDuplicate(existing: Wine[], winery: string, wine_name: string, vintage?: number | null): Wine | null {
  if (!winery || !wine_name) return null
  return existing.find(w =>
    w.quantity_remaining > 0 &&
    w.winery.toLowerCase().trim() === winery.toLowerCase().trim() &&
    w.wine_name.toLowerCase().trim() === wine_name.toLowerCase().trim() &&
    (vintage == null || w.vintage === vintage)
  ) ?? null
}

// Resize image to max 1280px on longest side before upload (big win for iPhone photos)
async function resizeImage(base64: string, mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1280
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = () => resolve(base64)
    img.src = `data:${mimeType};base64,${base64}`
  })
}

export function AddWineDialog({ open, onClose, sectionLabels, existingWines = [] }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [naturalText, setNaturalText] = useState('')
  const [wines, setWines] = useState<WineEntry[]>([])
  const [parsing, setParsing] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [parseError, setParseError] = useState('')
  const [apiError, setApiError] = useState('')   // billing / auth errors shown prominently

  // Scan state
  const [scannedData, setScannedData] = useState<any>(null)
  const [scanEnrichRaw, setScanEnrichRaw] = useState<any>(null)  // raw enrichment for supplement
  const [scanLoading, setScanLoading] = useState(false)     // reading label
  const [scanEnrichingBg, setScanEnrichingBg] = useState(false)  // enriching in background
  const [scanDuplicate, setScanDuplicate] = useState<Wine | null>(null)

  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraRequested, setCameraRequested] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // Manual mode duplicate check
  const [manualDuplicate, setManualDuplicate] = useState<Wine | null>(null)

  useEffect(() => {
    if (cameraRequested && videoRef.current && !cameraActive) {
      setCameraRequested(false)
      startCamera()
    }
  }, [cameraRequested, cameraActive])

  const reset = () => {
    setMode('choose')
    setNaturalText('')
    setWines([])
    setParseError('')
    setScannedData(null)
    setScanEnrichRaw(null)
    setScanLoading(false)
    setScanEnrichingBg(false)
    setScanDuplicate(null)
    setManualDuplicate(null)
    setApiError('')
    stopCamera()
  }

  const handleClose = () => { reset(); onClose() }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const constraints = isMobile
        ? { video: { facingMode: 'environment' } }
        : { video: { width: { ideal: 1920 }, height: { ideal: 1080 } } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraActive(true)
    } catch {
      setCameraError('Could not access camera. Check browser permissions or upload a photo instead.')
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1]
    stopCamera()
    await processScanImage(base64, 'image/jpeg')
  }

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      setCameraError('HEIC images are not supported. Please take a JPEG photo or convert the image first.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const raw = (reader.result as string).split(',')[1]
      const resized = await resizeImage(raw, file.type)
      await processScanImage(resized, 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  const processScanImage = async (base64: string, mediaType: string) => {
    setScanLoading(true)
    setCameraError('')
    setMode('scan')

    try {
      // Step 1: Scan label (fast ~5s) — show form immediately
      const scanRes = await fetch('/api/scan-label', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ image: base64, mediaType }),
      })
      const scanned = await scanRes.json()

      if (scanned.error === 'api_billing') { setApiError(scanned.message); setScanLoading(false); return }
      if (scanned.error) {
        setCameraError(scanned.error)
        setScanLoading(false)
        return
      }

      if (!scanned.winery && !scanned.wine_name) {
        setCameraError('Could not read any wine details from the label. Try better lighting or a clearer photo.')
        setScanLoading(false)
        return
      }

      setScannedData(scanned)
      setScanLoading(false)

      // Check for duplicate
      if (scanned.winery || scanned.wine_name) {
        setScanDuplicate(findDuplicate(existingWines, scanned.winery, scanned.wine_name, scanned.vintage))
      }

      // Step 2: Enrich in background — form is already showing
      setScanEnrichingBg(true)
      try {
        const enrichRes = await fetch('/api/enrich-wine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...scanned }),
        })
        const enriched = await enrichRes.json()
        setScanEnrichRaw(enriched)
      } catch {
        // Enrichment failed silently — form still works with scan data
      } finally {
        setScanEnrichingBg(false)
      }
    } catch {
      setCameraError('Scan failed. Try uploading a photo instead.')
      setScanLoading(false)
    }
  }

  // Only prefer base values over enriched for non-null base values
  const mergeData = (base: any, enriched: any) => {
    const result: Record<string, unknown> = {}
    const allKeys = Array.from(new Set([...Object.keys(base ?? {}), ...Object.keys(enriched ?? {})]))
    for (const key of allKeys) {
      result[key] = (base?.[key] !== null && base?.[key] !== undefined) ? base[key] : enriched?.[key]
    }
    return result
  }

  const handleNaturalParse = async () => {
    if (!naturalText.trim()) return
    setParsing(true)
    setParseError('')
    setWines([])
    try {
      const res = await fetch('/api/parse-wine', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ text: naturalText }),
      })
      const data = await res.json()
      if (data.error === 'api_billing') { setApiError(data.message); return }
      if (res.status === 401 || res.status === 403) {
        setParseError('Authentication error — try refreshing the page.')
        return
      }
      if (!data.wines?.length) {
        setParseError('Could not parse any wines. Try being more specific.')
        return
      }

      const entries: WineEntry[] = data.wines.map((w: any, i: number) => {
        // Map quantity → quantity_added / quantity_remaining
        const qty = w.quantity ?? 1
        const parsed = { ...w, quantity_added: qty, quantity_remaining: qty }
        delete parsed.quantity

        return {
          id: `${Date.now()}-${i}`,
          parsed,
          enriched: null,
          enriching: true,
          formData: parsed,
          expanded: i === 0,
          saved: false,
          duplicate: findDuplicate(existingWines, w.winery, w.wine_name, w.vintage),
        }
      })
      setWines(entries)

      // Enrich all in parallel — use entry IDs, not array indices, to avoid closure staleness
      data.wines.forEach(async (w: any, i: number) => {
        const entryId = entries[i].id
        const qty = w.quantity ?? 1
        try {
          const res = await fetch('/api/enrich-wine', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ ...w, quantity_added: qty, quantity_remaining: qty, _originalText: naturalText }),
          })
          const enriched = await res.json()
          const merged = mergeData({ ...w, quantity_added: qty, quantity_remaining: qty }, enriched)
          setWines(prev => prev.map(e => e.id === entryId
            ? { ...e, enriched: merged, formData: merged, enriching: false }
            : e
          ))
        } catch {
          setWines(prev => prev.map(e => e.id === entryId ? { ...e, enriching: false } : e))
        }
      })
    } catch {
      setParseError('Something went wrong. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  const updateFormData = (id: string, data: any) => {
    setWines(prev => prev.map(e => e.id === id ? { ...e, formData: data } : e))
  }

  const toggleExpanded = (id: string) => {
    setWines(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e))
  }

  const handleSaveAll = async () => {
    setSavingAll(true)
    try {
      for (const wine of wines) {
        if (wine.saved) continue
        await createWine({
          ...wine.formData,
          ai_confidence: wine.enriched?.ai_confidence ?? null,
        })
        setWines(prev => prev.map(e => e.id === wine.id ? { ...e, saved: true } : e))
      }
      handleClose()
    } finally {
      setSavingAll(false)
    }
  }

  const handleSaveScanned = async (formData: any) => {
    await createWine({
      ...formData,
      ai_confidence: scanEnrichRaw?.ai_confidence ?? null,
    })
    handleClose()
  }

  const wineLabel = (w: WineEntry) => {
    const d = w.formData
    return [d.vintage, d.winery, d.wine_name].filter(Boolean).join(' ') || 'Unknown Wine'
  }

  const handleManualSubmit = async (formData: any) => {
    // Enrichment already done by Claude; ensure user-typed values win
    const enrichRes = await fetch('/api/enrich-wine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    const enriched = await enrichRes.json()
    // User values always win: spread enriched first, then override with formData
    await createWine({
      ...enriched,
      ...formData,
      ai_confidence: enriched?.ai_confidence ?? null,
    } as any)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'choose' && 'Add Wine'}
            {mode === 'manual' && 'Add Wine'}
            {mode === 'natural' && (wines.length > 1 ? `Review ${wines.length} Wines` : 'Add Wine')}
            {mode === 'scan' && 'Label Scan'}
          </DialogTitle>
        </DialogHeader>

        {/* API billing/auth error */}
        {apiError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div><strong>API Error:</strong> {apiError}</div>
          </div>
        )}

        {/* Choose mode */}
        {mode === 'choose' && (
          <div className="space-y-3 py-4">
            <button onClick={() => setMode('manual')} className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left">
              <PenLine className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Manual Entry</div>
                <div className="text-sm text-muted-foreground">Fill in details yourself, Claude fills what's missing</div>
              </div>
            </button>

            <button onClick={() => { setMode('scan'); if (!isMobile) setCameraRequested(true) }} className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left">
              <Camera className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Scan Label</div>
                <div className="text-sm text-muted-foreground">{isMobile ? 'Take a photo, Claude reads the label' : 'Use your camera or upload a photo'}</div>
              </div>
            </button>

            <button onClick={() => setMode('natural')} className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left">
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">Just Type It</div>
                <div className="text-sm text-muted-foreground">"Arnot Roberts Pinot 2021, 3 bottles of DRC 2018..." — gifts, notes, anything</div>
              </div>
            </button>
          </div>
        )}

        {/* Natural language input */}
        {mode === 'natural' && wines.length === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Describe one or more wines. Add any notes (e.g. "gift from Dom & Becca") and they'll be saved. Claude parses and fills in all details.</p>
            <Textarea
              placeholder="Arnot Roberts Pinot 2021, 3 bottles of DRC La Tâche 2015, gift from mom — Nalle Zin 2022..."
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              rows={4}
              className="resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleNaturalParse() }}
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

        {/* Accordion review */}
        {mode === 'natural' && wines.length > 0 && (
          <div className="space-y-3 py-2">
            {wines.map((wine) => (
              <div key={wine.id} className="rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleExpanded(wine.id)}
                >
                  <div className="flex items-center gap-3">
                    {wine.saved && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                    {wine.enriching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                    <div>
                      <span className="font-medium">{wineLabel(wine)}</span>
                      {wine.duplicate && !wine.enriching && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">⚠ Already in cellar ({wine.duplicate.quantity_remaining} bottles)</span>
                      )}
                      {wine.enriching && <span className="text-xs text-muted-foreground ml-2">Enriching...</span>}
                      {wine.formData.varietal_blend && !wine.enriching && (
                        <span className="text-xs text-muted-foreground ml-2">{wine.formData.varietal_blend}</span>
                      )}
                    </div>
                  </div>
                  {wine.expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {wine.expanded && !wine.enriching && (
                  <div className="p-3 border-t border-border bg-background/50">
                    {wine.duplicate && (
                      <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                        ⚠ You already have <strong>{wine.duplicate.quantity_remaining}</strong> bottle{wine.duplicate.quantity_remaining !== 1 ? 's' : ''} of this in your cellar. Adding another anyway.
                      </div>
                    )}
                    {wine.enriched?.why_interesting && (
                      <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-200">✨ </span>
                        <span className="text-amber-700 dark:text-amber-300">{wine.enriched.why_interesting}</span>
                      </div>
                    )}
                    <WineForm
                      key={wine.id}
                      initial={wine.formData}
                      aiConfidence={wine.enriched?.ai_confidence}
                      sectionLabels={sectionLabels}
                      onSubmit={async (data) => { updateFormData(wine.id, data); toggleExpanded(wine.id) }}
                      submitLabel="Done ✓"
                    />
                  </div>
                )}

                {wine.expanded && wine.enriching && (
                  <div className="p-4 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Claude is filling in details...
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setWines([]); setMode('natural') }} className="shrink-0">← Edit</Button>
              <Button
                onClick={handleSaveAll}
                disabled={savingAll || wines.some(w => w.enriching)}
                className="flex-1"
              >
                {savingAll ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : `Save All ${wines.length} Wine${wines.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {/* Scan mode */}
        {mode === 'scan' && (
          <div className="space-y-4 py-2">
            {/* Desktop camera */}
            {!isMobile && !scannedData && (
              <div className="space-y-3">
                <div className={cameraActive ? 'space-y-3' : 'hidden'}>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                    <Button onClick={captureFrame} className="flex-1">📸 Capture Label</Button>
                  </div>
                </div>

                {!cameraActive && (
                  <div className="space-y-2">
                    {cameraError && (
                      <div className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {cameraError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={startCamera} className="flex-1">Use Camera</Button>
                      <label className="flex-1">
                        <Button variant="outline" className="w-full" asChild><span>Upload Photo</span></Button>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileCapture} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile file input */}
            {isMobile && !scannedData && !scanLoading && (
              <div className="space-y-2">
                {cameraError && (
                  <div className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {cameraError}
                  </div>
                )}
                <label className="block">
                  <Button className="w-full" asChild><span>📸 Take Photo / Upload</span></Button>
                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleFileCapture} />
                </label>
              </div>
            )}

            {/* Step 1: Reading label */}
            {scanLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading label... (this takes about 5 seconds)
              </div>
            )}

            {/* Step 2+: Form shown immediately after scan, with background enrichment indicator */}
            {!scanLoading && scannedData && (
              <>
                {scanDuplicate && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                    ⚠ You already have <strong>{scanDuplicate.quantity_remaining}</strong> bottle{scanDuplicate.quantity_remaining !== 1 ? 's' : ''} of this in your cellar.
                  </div>
                )}

                {scanEnrichingBg && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Claude is researching this wine and filling in more details...
                  </div>
                )}

                {scanEnrichRaw?.why_interesting && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                    <span className="font-medium text-amber-800 dark:text-amber-200">✨ </span>
                    <span className="text-amber-700 dark:text-amber-300">{scanEnrichRaw.why_interesting}</span>
                  </div>
                )}

                <WineForm
                  key="scan"
                  initial={scannedData}
                  aiConfidence={scanEnrichRaw?.ai_confidence}
                  enrichSupplement={scanEnrichRaw}
                  sectionLabels={sectionLabels}
                  onSubmit={handleSaveScanned}
                  submitLabel="Save Wine"
                />
              </>
            )}

            {!scannedData && !scanLoading && (
              <Button variant="ghost" className="w-full" onClick={() => { setMode('choose'); stopCamera() }}>← Back</Button>
            )}
          </div>
        )}

        {/* Manual entry */}
        {mode === 'manual' && (
          <div className="py-2">
            {manualDuplicate && (
              <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                ⚠ You already have <strong>{manualDuplicate.quantity_remaining}</strong> bottle{manualDuplicate.quantity_remaining !== 1 ? 's' : ''} of this in your cellar.
              </div>
            )}
            <WineForm
              key="manual"
              sectionLabels={sectionLabels}
              initial={{}}
              onSubmit={async (formData) => {
                setManualDuplicate(findDuplicate(existingWines, formData.winery, formData.wine_name, formData.vintage))
                await handleManualSubmit(formData)
              }}
              submitLabel="Save Wine — Claude will fill in details"
            />
            <Button variant="ghost" className="w-full mt-2" onClick={() => setMode('choose')}>← Back</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
