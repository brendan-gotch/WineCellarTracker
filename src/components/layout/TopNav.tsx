'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface Props {
  username?: string
  isAdmin?: boolean
}

export function TopNav({ username, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const links = [
    { href: '/', label: 'Cellar' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/audit', label: 'Audit' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }} className="sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg" style={{ color: 'var(--nav-text-active)' }}>
            🍷 <span className="hidden sm:inline">Wine Cellar</span>
          </Link>
          <nav className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={pathname === link.href
                  ? { color: 'var(--nav-accent)', background: 'rgba(192,56,90,0.12)' }
                  : { color: 'var(--nav-text)' }
                }
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {username && (
            <span className="text-sm hidden sm:block" style={{ color: 'var(--nav-text)' }}>{username}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            style={{ color: 'var(--nav-text)' }}
            className="hover:bg-white/10 hover:text-white"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {username && (
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out"
              style={{ color: 'var(--nav-text)' }}
              className="hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
