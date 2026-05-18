import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildEnrichmentPrompt } from '@/lib/wine-prompts'
import { getCellarContext, getSectionCounts } from '@/actions/wines'

export async function POST(req: NextRequest) {
  const known = await req.json()
  const [cellarContext, sectionCounts] = await Promise.all([getCellarContext(), getSectionCounts()])

  const prompt = buildEnrichmentPrompt(known, cellarContext, sectionCounts)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.filter((b) => b.type === 'text').pop()
  if (!textBlock || textBlock.type !== 'text') return NextResponse.json({})

  try {
    const raw = textBlock.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    return NextResponse.json(JSON.parse(jsonStr.trim()))
  } catch {
    return NextResponse.json({})
  }
}
