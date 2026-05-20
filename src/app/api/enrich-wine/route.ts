import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentSystemPrompt, buildEnrichmentUserMessage } from '@/lib/wine-prompts'
import { getCellarContext, getWines } from '@/actions/wines'
import { checkApiAuth } from '@/lib/api-auth'
import { logSystemAlert } from '@/lib/alerts'
import { getCollectionSummary } from '@/lib/collection-summary'
import { getSession } from '@/lib/session'

export const maxDuration = 120

function extractJson(text: string): string | null {
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blockMatch) return blockMatch[1].trim()
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0, inString = false, escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') depth++
    if (c === '}' && --depth === 0) return text.slice(start, i + 1)
  }
  return null
}

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const known = await req.json()
  const session = await getSession()
  const [cellarContext, allWines] = await Promise.all([getCellarContext(), getWines()])
  const collectionSummary = session ? await getCollectionSummary(session.userId, allWines) : null

  const systemPrompt = buildEnrichmentSystemPrompt(cellarContext, collectionSummary)
  const userMessage = buildEnrichmentUserMessage(known)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as any,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = message.content.filter((b) => b.type === 'text').pop()
    if (!textBlock || textBlock.type !== 'text') return NextResponse.json({})

    const raw = textBlock.text
    const jsonStr = extractJson(raw)

    if (!jsonStr) {
      console.error('[enrich-wine] No JSON found. Raw response:', raw.slice(0, 500))
      return NextResponse.json({})
    }

    try {
      return NextResponse.json(JSON.parse(jsonStr))
    } catch {
      console.error('[enrich-wine] JSON parse failed. Raw response:', raw.slice(0, 500))
      return NextResponse.json({})
    }
  } catch (err: any) {
    const isAuthError = err?.status === 401 || err?.status === 403
    const isBillingError = err?.status === 402 || err?.message?.toLowerCase().includes('credit') || err?.message?.toLowerCase().includes('billing')
    if (isAuthError || isBillingError) {
      void logSystemAlert('anthropic', 'Anthropic API key issue or insufficient credits. Visit console.anthropic.com to check billing.')
      return NextResponse.json({ error: 'api_billing', message: 'Anthropic API key issue or insufficient credits. Check your API key and billing.' }, { status: 402 })
    }
    return NextResponse.json({ error: 'api_error', message: err?.message ?? 'Enrichment failed' }, { status: 500 })
  }
}
