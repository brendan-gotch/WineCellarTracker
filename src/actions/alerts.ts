'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { dismissAlert as dbDismiss } from '@/lib/alerts'

function isAdmin(username: string) {
  const admin = process.env.ADMIN_USERNAME
  return admin && username === admin
}

export async function dismissAlertAction(id: string) {
  const session = await getSession()
  if (!session || !isAdmin(session.username)) return
  await dbDismiss(id)
  revalidatePath('/', 'layout')
}
