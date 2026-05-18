import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildLabelScanPrompt } from '@/lib/wine-prompts'

export async function POST(req: NextRequest) {
  const { image, mediaType } = await req.json()
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const imgType = validTypes.includes(mediaType) ? mediaType : 'image/jpeg'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imgType, data: image } },
        { type: 'text', text: buildLabelScanPrompt() },
      ],
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return NextResponse.json({})

  try {
    return NextResponse.json(JSON.parse(content.text))
  } catch {
    return NextResponse.json({})
  }
}
