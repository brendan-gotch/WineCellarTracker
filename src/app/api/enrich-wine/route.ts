import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentPrompt } from '@/lib/wine-prompts'
import { getCellarContext, getSectionCounts } from '@/actions/wines'
import { checkApiAuth } from '@/lib/api-auth'
import { logSystemAlert } from '@/lib/alerts'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const known = await req.json()
  const [cellarContext, sectionCounts] = await Promise.all([getCellarContext(), getSectionCounts()])

  const prompt = buildEnrichmentPrompt(known, cellarContext, sectionCounts)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.filter((b) => b.type === 'text').pop()
    if (!textBlock || textBlock.type !== 'text') return NextResponse.json({})

    const raw = textBlock.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    return NextResponse.json(JSON.parse(jsonStr.trim()))
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
