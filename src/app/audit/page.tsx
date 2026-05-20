export const dynamic = 'force-dynamic'

import { getWines } from '@/actions/wines'
import { AuditMode } from '@/components/audit/AuditMode'
import { CellarToolsPanel } from '@/components/audit/CellarToolsPanel'

export default async function AuditPage() {
  const wines = await getWines()
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Audit</h1>
        <p className="text-sm text-muted-foreground mt-1">Reconcile your physical cellar and run maintenance tools.</p>
      </div>
      <div>
        <h2 className="text-base font-semibold mb-3">Cellar Tools</h2>
        <CellarToolsPanel wines={wines} />
      </div>
      <div>
        <h2 className="text-base font-semibold mb-3">Cellar Chat</h2>
        <AuditMode wines={wines} />
      </div>
    </div>
  )
}
