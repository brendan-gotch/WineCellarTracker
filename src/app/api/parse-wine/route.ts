import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildNaturalLanguageParsePrompt } from '@/lib/wine-prompts'
import { checkApiAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildNaturalLanguageParsePrompt(text) }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ wines: [] })

    const raw = content.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    return NextResponse.json(JSON.parse(jsonStr.trim()))
  } catch (err: any) {
    console.error('[parse-wine] error:', err?.status, err?.message)
    const isAuthError = err?.status === 401 || err?.status === 403
    const isBillingError = err?.status === 402 || err?.message?.toLowerCase().includes('credit') || err?.message?.toLowerCase().includes('billing')
    if (isAuthError || isBillingError) {
      return NextResponse.json({ error: 'api_billing', message: 'Anthropic API key issue or insufficient credits.' }, { status: 402 })
    }
    return NextResponse.json({ wines: [], error: 'api_error', message: err?.message ?? 'Unknown error' })
  }
}
