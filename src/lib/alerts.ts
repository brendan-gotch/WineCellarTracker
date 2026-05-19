import { db } from '@/db'
import { system_alerts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Upsert: one active alert per service at a time
export async function logSystemAlert(service: string, message: string) {
  try {
    // Clear any existing undismissed alert for this service first
    await db.delete(system_alerts).where(and(eq(system_alerts.service, service), eq(system_alerts.dismissed, false)))
    await db.insert(system_alerts).values({ service, message })
  } catch {
    // Alert logging must never break the main request flow
  }
}

export async function getActiveAlerts() {
  return db.select().from(system_alerts).where(eq(system_alerts.dismissed, false))
}

export async function dismissAlert(id: string) {
  await db.update(system_alerts).set({ dismissed: true }).where(eq(system_alerts.id, id))
}
