import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentSystemPrompt, buildEnrichmentUserMessage } from '@/lib/wine-prompts'
import { getCellarContext, getSectionCounts } from '@/actions/wines'
import { checkApiAuth } from '@/lib/api-auth'
import { logSystemAlert } from '@/lib/alerts'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const known = await req.json()
  const [cellarContext, sectionCounts] = await Promise.all([getCellarContext(), getSectionCounts()])

  const systemPrompt = buildEnrichmentSystemPrompt(cellarContext, sectionCounts)
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

    // Try markdown block first, then fall back to finding outermost { ... }
    const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    let jsonStr = blockMatch ? blockMatch[1].trim() : raw.trim()
    if (!blockMatch) {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start !== -1 && end > start) jsonStr = raw.slice(start, end + 1)
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
