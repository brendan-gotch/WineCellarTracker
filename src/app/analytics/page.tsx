export const dynamic = 'force-dynamic'

import { getWines } from '@/actions/wines'
import { getDrankLog } from '@/actions/drank'
import { computeDrinkingStatus } from '@/lib/drinking-status'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const [wines, drankLog] = await Promise.all([getWines(), getDrankLog()])
  return <AnalyticsDashboard wines={wines} drankLog={drankLog} />
}
