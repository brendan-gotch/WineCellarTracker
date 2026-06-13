import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildSommChatPrompt } from '@/lib/wine-prompts'
import { checkApiAuth } from '@/lib/api-auth'
import { logSystemAlert } from '@/lib/alerts'
import { getSession } from '@/lib/session'
import { getWines } from '@/actions/wines'
import { getCollectionSummary } from '@/lib/collection-summary'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  const allWines = await getWines()
  const activeWines = allWines
    .filter(w => w.quantity_remaining > 0)
    .map(w => ({
      winery: w.winery,
      wine_name: w.wine_name,
      vintage: w.vintage,
      non_vintage: w.non_vintage,
      varietal_blend: w.varietal_blend,
      country: w.country,
      region: w.region,
      quantity_remaining: w.quantity_remaining,
      drinking_window_start: w.drinking_window_start,
      drinking_window_end: w.drinking_window_end,
      price: w.price,
      perfect_pairing: w.perfect_pairing,
    }))

  const collectionSummary = await getCollectionSummary(session.userId, allWines)

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSommChatPrompt(activeWines, collectionSummary),
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
      cancel() { stream.abort() },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err: any) {
    const isBillingError = err?.status === 402 || err?.message?.toLowerCase().includes('credit')
    if (isBillingError) void logSystemAlert('anthropic', 'Anthropic API key issue or insufficient credits. Visit console.anthropic.com to check billing.')
    return NextResponse.json(
      { error: isBillingError ? 'api_billing' : 'api_error', message: err?.message ?? 'Chat failed' },
      { status: isBillingError ? 402 : 500 }
    )
  }
}
