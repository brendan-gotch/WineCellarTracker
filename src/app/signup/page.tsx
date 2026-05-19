'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Show invite code field only if NEXT_PUBLIC_INVITE_REQUIRED is set
  const needsInvite = process.env.NEXT_PUBLIC_INVITE_REQUIRED === 'true'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, inviteCode: inviteCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); return }
      router.push('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🍷</div>
          <h1 className="text-2xl font-bold">Wine Cellar</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your cellar</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {needsInvite && (
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Account
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
