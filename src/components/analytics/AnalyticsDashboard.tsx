'use client'

import { useMemo } from 'react'
import type { Wine, DrankLog } from '@/db/schema'
import { computeDrinkingStatus, DRINKING_STATUS_LABELS } from '@/lib/drinking-status'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3']

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

interface Props {
  wines: Wine[]
  drankLog: DrankLog[]
}

export function AnalyticsDashboard({ wines, drankLog }: Props) {
  const activeWines = wines.filter(w => w.quantity_remaining > 0)
  const totalBottles = activeWines.reduce((s, w) => s + w.quantity_remaining, 0)

  const byVarietal = useMemo(() => {
    const map: Record<string, number> = {}
    activeWines.forEach(w => {
      const key = w.varietal_blend || 'Unknown'
      map[key] = (map[key] || 0) + w.quantity_remaining
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
  }, [activeWines])

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {}
    activeWines.forEach(w => {
      const key = w.country || 'Unknown'
      map[key] = (map[key] || 0) + w.quantity_remaining
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [activeWines])

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    activeWines.forEach(w => {
      const s = computeDrinkingStatus(w.drinking_window_start, w.drinking_window_end)
      map[s] = (map[s] || 0) + 1
    })
    return Object.entries(map).map(([key, value]) => ({ name: DRINKING_STATUS_LABELS[key as keyof typeof DRINKING_STATUS_LABELS] || key, value }))
  }, [activeWines])

  const consumptionByYear = useMemo(() => {
    const map: Record<string, number> = {}
    drankLog.forEach(d => {
      const year = new Date(d.date_drank).getFullYear().toString()
      map[year] = (map[year] || 0) + 1
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }))
  }, [drankLog])

  const avgRating = drankLog.length > 0
    ? (drankLog.filter(d => d.rating).reduce((s, d) => s + (d.rating ?? 0), 0) / drankLog.filter(d => d.rating).length).toFixed(1)
    : '—'

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Wines in cellar" value={activeWines.length} />
        <StatCard label="Total bottles" value={totalBottles} />
        <StatCard label="Bottles consumed" value={drankLog.length} />
        <StatCard label="Avg rating" value={avgRating} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="font-semibold">By Varietal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVarietal} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#be123c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">By Country</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCountry} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name ?? ''} ${Math.round(((percent as number) ?? 0) * 100)}%`}>
                  {byCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Drinking Status</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#be123c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {consumptionByYear.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Bottles Consumed by Year</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionByYear}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#be123c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
