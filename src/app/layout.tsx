import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { TopNav } from '@/components/layout/TopNav'
import { AdminAlerts } from '@/components/layout/AdminAlerts'
import { getSession } from '@/lib/session'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wine Cellar',
  description: 'Your personal wine cellar tracker',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (session) {
    // Fire-and-forget: update last_seen without blocking render
    void db.update(users).set({ last_seen: new Date() }).where(eq(users.id, session.userId))
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="x-api-secret" content={process.env.API_SECRET ?? ''} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TopNav username={session?.username} isAdmin={session?.username === process.env.ADMIN_USERNAME} />
          {session?.username === process.env.ADMIN_USERNAME && <AdminAlerts />}
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
