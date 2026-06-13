'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { previewSectionReassignment, applySectionReassignment, updateWineFact } from '@/actions/wines'
import { apiHeaders } from '@/lib/api-auth'
import type { Wine } from '@/db/schema'

type ReassignChange = {
  id: string
  winery: string
  wine_name: string
  varietal_blend: string | null
  currentSection: string | null
  proposedSection: string | null
}

function ReassignTool() {
  const [state, setState] = useState<'idle' | 'previewing' | 'preview' | 'applying' | 'done'>('idle')
  const [changes, setChanges] = useState<ReassignChange[]>([])

  const preview = async () => {
    setState('previewing')
    const result = await previewSectionReassignment()
    setChanges(result)
    setState('preview')
  }

  const apply = async () => {
    setState('applying')
    await applySectionReassignment(changes.map(c => ({ id: c.id, cellar_section: c.proposedSection! })))
    setState('done')
  }

  if (state === 'idle') return (
    <Button variant="outline" onClick={preview} className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4" /> Re-assign Sections
    </Button>
  )
  if (state === 'previewing') return <Button variant="outline" disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Analysing cellar...</Button>
  if (state === 'done') return <p className="text-sm text-green-600 dark:text-green-400">✓ {changes.length} wines reassigned.</p>
  if (state === 'applying') return <Button disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Applying...</Button>

  if (state === 'preview') {
    if (changes.length === 0) return <p className="text-sm text-muted-foreground">All sections look correct — no changes needed.</p>
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{changes.length} wines would move:</p>
        <div className="rounded-lg border border-border overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Wine</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Varietal</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">From</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">To</th>
              </tr>
            </thead>
            <tbody>
              {changes.map(c => (
                <tr key={c.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{c.winery} {c.wine_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.varietal_blend ?? '—'}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{c.currentSection ?? '—'}</td>
                  <td className="px-3 py-2 text-center font-medium text-primary">{c.proposedSection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setState('idle')}>Cancel</Button>
          <Button onClick={apply}>Apply {changes.length} Changes</Button>
        </div>
      </div>
    )
  }

  return null
}

function RefreshFactsTool({ wines }: { wines: Wine[] }) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [errors, setErrors] = useState(0)

  const run = async () => {
    const activeWines = wines.filter(w => w.quantity_remaining > 0)
    setState('running')
    setProgress({ done: 0, total: activeWines.length })
    setErrors(0)

    const CONCURRENCY = 2
    for (let i = 0; i < activeWines.length; i += CONCURRENCY) {
      await Promise.all(activeWines.slice(i, i + CONCURRENCY).map(async (wine) => {
        try {
          const res = await fetch('/api/enrich-wine', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ ...wine, _refreshFact: true }),
          })
          const data = await res.json()
          if (data.why_interesting) {
            await updateWineFact(wine.id, data.why_interesting, data.perfect_pairing)
          }
        } catch {
          setErrors(e => e + 1)
        }
        setProgress(p => ({ ...p, done: p.done + 1 }))
      }))
    }
    setState('done')
  }

  if (state === 'idle') return (
    <Button variant="outline" onClick={run} className="flex items-center gap-2">
      <Sparkles className="h-4 w-4" /> Refresh All Facts
    </Button>
  )

  if (state === 'running') return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Refreshing facts… {progress.done} / {progress.total}
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )

  return (
    <p className="text-sm text-green-600 dark:text-green-400">
      ✓ Done — {progress.total - errors} facts updated{errors > 0 ? `, ${errors} failed` : ''}.
    </p>
  )
}

export function CellarToolsPanel({ wines }: { wines: Wine[] }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-6">
      <div>
        <div className="font-medium text-sm mb-1">Re-assign Sections</div>
        <div className="text-xs text-muted-foreground mb-3">Run body-weight section rules against your cellar and preview what would move.</div>
        <ReassignTool />
      </div>
      <div className="border-t border-border/50 pt-4">
        <div className="font-medium text-sm mb-1">Refresh All "Why Interesting" Facts</div>
        <div className="text-xs text-muted-foreground mb-3">Re-generates the interesting fact for every wine in your cellar. Runs 2 at a time — may take a few minutes.</div>
        <RefreshFactsTool wines={wines} />
      </div>
    </div>
  )
}
