'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { previewSectionReassignment, applySectionReassignment } from '@/actions/wines'

type Change = {
  id: string
  winery: string
  wine_name: string
  varietal_blend: string | null
  currentSection: string | null
  proposedSection: string | null
}

export function ReassignSectionsButton() {
  const [state, setState] = useState<'idle' | 'previewing' | 'preview' | 'applying' | 'done'>('idle')
  const [changes, setChanges] = useState<Change[]>([])

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

  if (state === 'idle') {
    return (
      <Button variant="outline" onClick={preview} className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Re-assign Sections
      </Button>
    )
  }

  if (state === 'previewing') {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Analysing cellar...
      </Button>
    )
  }

  if (state === 'done') {
    return <p className="text-sm text-green-600 dark:text-green-400">✓ {changes.length} wines reassigned.</p>
  }

  if (state === 'preview') {
    if (changes.length === 0) {
      return <p className="text-sm text-muted-foreground">All sections already look correct — no changes needed.</p>
    }
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{changes.length} wines would move sections:</p>
        <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
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

  if (state === 'applying') {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Applying...
      </Button>
    )
  }

  return null
}
