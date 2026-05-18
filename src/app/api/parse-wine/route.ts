import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildNaturalLanguageParsePrompt } from '@/lib/wine-prompts'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildNaturalLanguageParsePrompt(text) }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return NextResponse.json({ wines: [] })

  try {
    const parsed = JSON.parse(content.text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ wines: [] })
  }
}
