import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentPrompt } from '@/lib/wine-prompts'
import { getCellarContext } from '@/actions/wines'

export async function POST(req: NextRequest) {
  const known = await req.json()
  const cellarContext = await getCellarContext()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildEnrichmentPrompt(known, cellarContext) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return NextResponse.json({})

  try {
    const enriched = JSON.parse(content.text)
    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({})
  }
}
