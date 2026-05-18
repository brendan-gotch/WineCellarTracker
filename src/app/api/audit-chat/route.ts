import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildAuditPrompt } from '@/lib/wine-prompts'
import { checkApiAuth } from '@/lib/api-auth'
import { db } from '@/db'
import { wines } from '@/db/schema'
import { eq, gt, and } from 'drizzle-orm'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authError = checkApiAuth(req)
  if (authError) return authError

  const { messages, section } = await req.json()

  // Fetch wines server-side — never trust the client-supplied list
  const sectionWines = await (section && section !== 'all'
    ? db.select({
        id: wines.id, winery: wines.winery, wine_name: wines.wine_name,
        vintage: wines.vintage, quantity_remaining: wines.quantity_remaining,
        drinking_window_start: wines.drinking_window_start, drinking_window_end: wines.drinking_window_end,
      }).from(wines).where(and(eq(wines.cellar_section, section), gt(wines.quantity_remaining, 0)))
    : db.select({
        id: wines.id, winery: wines.winery, wine_name: wines.wine_name,
        vintage: wines.vintage, quantity_remaining: wines.quantity_remaining,
        drinking_window_start: wines.drinking_window_start, drinking_window_end: wines.drinking_window_end,
      }).from(wines).where(gt(wines.quantity_remaining, 0))
  )

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildAuditPrompt(section ?? 'all sections', sectionWines),
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
    return NextResponse.json(
      { error: isBillingError ? 'api_billing' : 'api_error', message: err?.message ?? 'Chat failed' },
      { status: isBillingError ? 402 : 500 }
    )
  }
}
