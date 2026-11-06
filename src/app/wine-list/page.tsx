export const dynamic = 'force-dynamic'

import { getWines } from '@/actions/wines'
import { WineListView } from '@/components/wine-list/WineListView'

export default async function WineListPage() {
  const wines = await getWines()
  return <WineListView wines={wines} />
}
