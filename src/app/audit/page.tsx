export const dynamic = 'force-dynamic'

import { getWines } from '@/actions/wines'
import { AuditMode } from '@/components/audit/AuditMode'

export default async function AuditPage() {
  const wines = await getWines()
  return <AuditMode wines={wines} />
}
