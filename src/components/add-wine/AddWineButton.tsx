'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddWineDialog } from './AddWineDialog'
import type { Wine } from '@/db/schema'

interface Props {
  sectionLabels?: Record<number, string>
  wines?: Wine[]
}

export function AddWineButton({ sectionLabels, wines }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add Wine
      </Button>
      <AddWineDialog open={open} onClose={() => setOpen(false)} sectionLabels={sectionLabels} existingWines={wines} />
    </>
  )
}
