import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/db'
import { users, wines } from '@/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

function timeAgo(date: Date | null): string {
  if (!date) return 'never'
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 86400 * 7) return `${Math.floor(secs / 86400)}d ago`
  return date.toLocaleDateString()
}

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.username !== process.env.ADMIN_USERNAME) redirect('/')

  const userStats = await db
    .select({
      id: users.id,
      username: users.username,
      created_at: users.created_at,
      last_seen: users.last_seen,
      wines: sql<number>`count(distinct ${wines.id})`,
      bottles: sql<number>`coalesce(sum(${wines.quantity_remaining}), 0)`,
    })
    .from(users)
    .leftJoin(wines, eq(wines.user_id, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.created_at))

  const totals = userStats.reduce(
    (acc, u) => ({ users: acc.users + 1, wines: acc.wines + Number(u.wines), bottles: acc.bottles + Number(u.bottles) }),
    { users: 0, wines: 0, bottles: 0 }
  )

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Only visible to you</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Accounts', value: totals.users },
          { label: 'Total Wines', value: totals.wines },
          { label: 'Total Bottles', value: totals.bottles },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border p-4 text-center">
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div>
        <h2 className="text-base font-semibold mb-3">Accounts</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Username</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last seen</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Wines</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Bottles</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.username === process.env.ADMIN_USERNAME && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.created_at?.toLocaleDateString() ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.last_seen)}</td>
                  <td className="px-4 py-3 text-right">{u.wines}</td>
                  <td className="px-4 py-3 text-right">{u.bottles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing links */}
      <div>
        <h2 className="text-base font-semibold mb-3">Billing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Anthropic', url: 'https://console.anthropic.com/settings/billing', desc: 'API credits' },
            { name: 'Vercel', url: 'https://vercel.com/account/billing', desc: 'Hosting' },
            { name: 'Turso', url: 'https://app.turso.tech/settings/billing', desc: 'Database' },
          ].map(({ name, url, desc }) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-border p-4 hover:bg-accent transition-colors">
              <div className="font-medium">{name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
