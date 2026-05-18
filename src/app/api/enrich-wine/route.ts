import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentPrompt } from '@/lib/wine-prompts'
import { getCellarContext } from '@/actions/wines'

export async function POST(req: NextRequest) {
  const known = await req.json()
  const cellarContext = await getCellarContext()

  const prompt = buildEnrichmentPrompt(known, cellarContext)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [
      {
        type: 'web_search_20250305' as any,
        name: 'web_search',
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  })

  // Find the final text block (after any tool use)
  const textBlock = message.content.filter((b) => b.type === 'text').pop()
  if (!textBlock || textBlock.type !== 'text') return NextResponse.json({})

  try {
    const raw = textBlock.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    const enriched = JSON.parse(jsonStr.trim())
    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({})
  }
}
