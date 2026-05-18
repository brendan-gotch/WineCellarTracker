import { NextRequest } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildAuditPrompt } from '@/lib/wine-prompts'

export async function POST(req: NextRequest) {
  const { messages, section, wines } = await req.json()

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildAuditPrompt(section ?? 'all sections', wines ?? []),
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
