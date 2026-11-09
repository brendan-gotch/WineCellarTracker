export const dynamic = 'force-dynamic'

import { getDrankHistory } from '@/actions/drank'
import { DrankHistory } from '@/components/drank/DrankHistory'

export default async function DrankPage() {
  const history = await getDrankHistory()
  return <DrankHistory history={history} />
}
