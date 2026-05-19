import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { TopNav } from '@/components/layout/TopNav'
import { getSession } from '@/lib/session'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wine Cellar',
  description: 'Your personal wine cellar tracker',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="x-api-secret" content={process.env.API_SECRET ?? ''} />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TopNav username={session?.username} />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
