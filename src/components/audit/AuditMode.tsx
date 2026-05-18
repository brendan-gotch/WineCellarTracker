'use client'

import { useState, useRef } from 'react'
import type { Wine } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateWine, markVerified } from '@/actions/wines'
import { logDrank } from '@/actions/drank'
import { DrinkingStatusBadge } from '@/components/cellar/DrinkingStatusBadge'
import { CheckCircle2, Send, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Props { wines: Wine[] }

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface ProposedChange {
  wine_id: string
  action: 'update_quantity' | 'log_drank' | 'remove'
  quantity_remaining?: number
  date_drank?: string
  notes?: string
}

export function AuditMode({ wines }: Props) {
  const sections = Array.from(new Set(wines.map(w => w.cellar_section).filter(Boolean))) as string[]
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[]>([])
  const [applyingChanges, setApplyingChanges] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sectionWines = selectedSection === 'all'
    ? wines.filter(w => w.quantity_remaining > 0)
    : wines.filter(w => w.cellar_section === selectedSection && w.quantity_remaining > 0)

  const handleVerifyAll = async () => {
    await Promise.all(sectionWines.map(w => markVerified(w.id)))
    alert(`Marked ${sectionWines.length} wines as verified.`)
  }

  const sendMessage = async () => {
    if (!input.trim() || streaming) return
    const userMessage: ChatMessage = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/audit-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          section: selectedSection,
          wines: sectionWines.map(w => ({ id: w.id, winery: w.winery, wine_name: w.wine_name, vintage: w.vintage, quantity_remaining: w.quantity_remaining })),
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value)
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: assistantText }
          return copy
        })
      }

      // Extract changes block
      const changesMatch = assistantText.match(/<changes>([\s\S]*?)<\/changes>/)
      if (changesMatch) {
        try {
          const { changes } = JSON.parse(changesMatch[1])
          if (changes?.length > 0) setPendingChanges(changes)
        } catch {}
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
      }
    } finally {
      setStreaming(false)
    }
  }

  const applyChanges = async () => {
    setApplyingChanges(true)
    try {
      for (const change of pendingChanges) {
        if (change.action === 'update_quantity' && change.quantity_remaining !== undefined) {
          await updateWine(change.wine_id, { quantity_remaining: change.quantity_remaining })
        } else if (change.action === 'log_drank') {
          await logDrank({
            wine_id: change.wine_id,
            date_drank: change.date_drank ? new Date(change.date_drank) : new Date(),
            notes: change.notes ?? null,
            rating: null,
            occasion: null,
          })
        } else if (change.action === 'remove') {
          await updateWine(change.wine_id, { quantity_remaining: 0 })
        }
      }
      setPendingChanges([])
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ Changes applied successfully!' }])
    } finally {
      setApplyingChanges(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Cellar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Reconcile physical reality against your records</p>
        </div>
        <Button variant="outline" onClick={handleVerifyAll}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Mark All Verified
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{sectionWines.length} wines in view</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wine list */}
        <div className="space-y-2">
          {sectionWines.map(wine => (
            <div key={wine.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{wine.vintage && `${wine.vintage} `}{wine.winery}</div>
                <div className="text-sm text-muted-foreground truncate">{wine.wine_name}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DrinkingStatusBadge windowStart={wine.drinking_window_start} windowEnd={wine.drinking_window_end} />
                <span className="text-sm font-medium w-6 text-center">{wine.quantity_remaining}</span>
                {wine.last_verified && (
                  <span className="text-xs text-muted-foreground" title={`Verified ${format(wine.last_verified, 'MMM d, yyyy')}`}>
                    ✓
                  </span>
                )}
              </div>
            </div>
          ))}
          {sectionWines.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No wines in this section</div>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex flex-col h-[500px] rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">
            Freeform Reconciliation
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Tell me what you find. Try: "I can only find 2 of the Arnot Roberts, not 3" or "I drank the 2018 Scribe last Tuesday, 4 stars"
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-lg px-3 py-2 max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {m.content.replace(/<changes>[\s\S]*?<\/changes>/g, '').trim()}
                </div>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
              </div>
            )}
          </div>

          {pendingChanges.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-amber-50 dark:bg-amber-950/30">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                {pendingChanges.length} proposed {pendingChanges.length === 1 ? 'change' : 'changes'}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyChanges} disabled={applyingChanges} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {applyingChanges ? 'Applying...' : 'Apply Changes'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingChanges([])}>Dismiss</Button>
              </div>
            </div>
          )}

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What do you find in your cellar?"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={streaming}
            />
            <Button size="icon" onClick={sendMessage} disabled={streaming || !input.trim()}>
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
