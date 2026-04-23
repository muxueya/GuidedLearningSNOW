import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

export const MODEL = 'claude-sonnet-4-6'
export const MAX_TOKENS = 1024

const encoder = new TextEncoder()

export function buildSystemPrompt(opts: { topic: string; mode: 'tutor' | 'agent' }): Anthropic.TextBlockParam[] {
  const persona = `You are an expert tutor helping a user with light ADHD learn about "${opts.topic}".
Keep all responses concise — maximum 250 words per message. One idea per message. Never write walls of text.
Always signal what comes next at the end of each message (e.g., "Next: I'll cover X" or "Ready for a quick quiz?").
Adapt to the user's pace. Be encouraging, clear, and direct.`

  const modeInstructions =
    opts.mode === 'agent'
      ? `You are running in AGENT MODE. You drive the session autonomously. Plan a curriculum, deliver it in chunks, quiz the user between subtopics, and create flashcards. Use your tools proactively.`
      : `You are running in TUTOR MODE. Answer the user's questions, explain concepts clearly, and suggest moving forward when appropriate. When the user types /quiz, generate a quiz immediately.`

  return [
    {
      type: 'text',
      text: persona,
    },
    {
      type: 'text',
      text: modeInstructions,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

export function buildUserMessage(content: string): { role: 'user'; content: string } {
  return { role: 'user', content }
}

export function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export function makeSSEStream(
  fn: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await fn(controller)
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export function send(controller: ReadableStreamDefaultController<Uint8Array>, data: unknown): void {
  controller.enqueue(encoder.encode(encodeSSE(data)))
}
