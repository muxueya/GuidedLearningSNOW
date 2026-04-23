import { NextRequest } from 'next/server'
import { getAnthropic, MODEL, MAX_TOKENS, buildSystemPrompt, makeSSEStream, send } from '@/lib/claude'
import { getDb, getDocument } from '@/lib/db'
import type Anthropic from '@anthropic-ai/sdk'

interface ChatRequest {
  topic: string
  documentId?: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(req: NextRequest) {
  const { topic, documentId, messages } = await req.json() as ChatRequest

  const documentContent = documentId ? getDocument(getDb(), documentId)?.content : undefined

  return makeSSEStream(async (controller) => {
    try {
      const system = buildSystemPrompt({ topic, mode: 'tutor', documentContent })
      const stream = getAnthropic().messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: messages as Anthropic.MessageParam[],
      })
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send(controller, { type: 'delta', text: event.delta.text })
        }
        if (event.type === 'message_stop') {
          send(controller, { type: 'done' })
        }
      }
    } catch (err) {
      send(controller, { type: 'error', message: err instanceof Error ? err.message : 'stream failed' })
    }
  })
}
