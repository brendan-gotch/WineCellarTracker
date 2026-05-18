import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildNaturalLanguageParsePrompt } from '@/lib/wine-prompts'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildNaturalLanguageParsePrompt(text) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return NextResponse.json({ wines: [] })

  try {
    // Extract JSON even if Claude wraps it in markdown code fences
    const raw = content.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    const parsed = JSON.parse(jsonStr.trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ wines: [] })
  }
}
