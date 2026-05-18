import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { TopNav } from '@/components/layout/TopNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wine Cellar',
  description: 'Your personal wine cellar tracker',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TopNav />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
