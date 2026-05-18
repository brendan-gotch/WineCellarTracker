import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildLabelScanPrompt } from '@/lib/wine-prompts'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_BASE64_LENGTH = 7_000_000 // ~5 MB decoded

export async function POST(req: NextRequest) {
  const { image, mediaType } = await req.json()
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  if (image.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image is too large. Please use a smaller photo.' }, { status: 413 })
  }

  if (!VALID_TYPES.includes(mediaType)) {
    return NextResponse.json(
      { error: `Unsupported image format (${mediaType}). Please use JPEG or PNG.` },
      { status: 415 }
    )
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: buildLabelScanPrompt() },
      ],
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return NextResponse.json({})

  try {
    const raw = content.text
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    return NextResponse.json(JSON.parse(jsonStr.trim()))
  } catch {
    return NextResponse.json({})
  }
}
