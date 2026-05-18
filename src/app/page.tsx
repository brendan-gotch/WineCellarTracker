export const dynamic = 'force-dynamic'

import { getWines } from '@/actions/wines'
import { CellarGrid } from '@/components/cellar/CellarGrid'
import { AddWineButton } from '@/components/add-wine/AddWineButton'
import { computeSectionLabels } from '@/lib/cellar-sections'

export default async function HomePage() {
  const wines = await getWines()
  const sectionLabels = computeSectionLabels(wines)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Cellar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {wines.filter(w => w.quantity_remaining > 0).length} wines · {wines.reduce((s, w) => s + w.quantity_remaining, 0)} bottles
          </p>
        </div>
        <AddWineButton sectionLabels={sectionLabels} wines={wines} />
      </div>
      <CellarGrid wines={wines} sectionLabels={sectionLabels} />
    </div>
  )
}
