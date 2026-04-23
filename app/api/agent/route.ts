import { NextRequest } from 'next/server'
import { getAnthropic, MODEL, buildSystemPrompt, makeSSEStream, send } from '@/lib/claude'
import { TOOL_DEFINITIONS } from '@/lib/tools'
import { executeSearchWeb } from '@/lib/tools/search_web'
import { executeSaveNote } from '@/lib/tools/save_note'
import { executeGetProgress } from '@/lib/tools/get_progress'
import { executeGenerateQuiz } from '@/lib/tools/generate_quiz'
import { executeSetMusicMood } from '@/lib/tools/set_music_mood'
import { executeMarkComplete } from '@/lib/tools/mark_complete'
import { executeCreateFlashcard } from '@/lib/tools/create_flashcard'
import { getDb, getDocument } from '@/lib/db'
import type Anthropic from '@anthropic-ai/sdk'
import type { Mood } from '@/lib/music'

const AGENT_MAX_TOKENS = 2048

interface AgentRequest {
  topic: string
  durationMins: number
  sessionId: number
  documentId?: number
}

type ToolInput = Record<string, unknown>

async function executeTool(name: string, input: ToolInput, sessionId: number, db: ReturnType<typeof getDb>): Promise<unknown> {
  switch (name) {
    case 'search_web':
      return executeSearchWeb({ query: input.query as string, limit: input.limit as number | undefined })
    case 'save_note':
      return executeSaveNote(db, { sessionId, content: input.content as string })
    case 'get_progress':
      return executeGetProgress(db, { topic: input.topic as string })
    case 'generate_quiz':
      return executeGenerateQuiz({ subtopic: input.subtopic as string, questionCount: input.questionCount as number })
    case 'set_music_mood':
      return executeSetMusicMood({ mood: input.mood as Mood })
    case 'mark_complete':
      return executeMarkComplete(db, { sessionId, topicName: input.topicName as string, score: input.score as number })
    case 'create_flashcard':
      return executeCreateFlashcard({ front: input.front as string, back: input.back as string })
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(req: NextRequest) {
  const { topic, durationMins, sessionId, documentId } = await req.json() as AgentRequest

  const documentContent = documentId ? getDocument(getDb(), documentId)?.content : undefined

  return makeSSEStream(async (controller) => {
    const system = buildSystemPrompt({ topic, mode: 'agent', documentContent })
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Start a ${durationMins}-minute learning session about "${topic}". Begin by checking my progress, then plan and deliver the session.`,
      },
    ]

    const db = getDb()
    let continueLoop = true
    let iterations = 0
    const MAX_ITERATIONS = 20

    while (continueLoop) {
      if (++iterations > MAX_ITERATIONS) {
        send(controller, { type: 'error', message: 'Agent reached maximum iterations' })
        break
      }
      let response: Anthropic.Message
      try {
        response = await getAnthropic().messages.create({
          model: MODEL,
          max_tokens: AGENT_MAX_TOKENS,
          system,
          tools: TOOL_DEFINITIONS,
          messages,
        })
      } catch (err) {
        send(controller, { type: 'error', message: err instanceof Error ? err.message : 'API call failed' })
        break
      }

      // Send all text blocks first
      for (const block of response.content) {
        if (block.type === 'text') {
          send(controller, { type: 'text', text: block.text })
        }
      }

      // Collect and execute all tool_use blocks
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        send(controller, { type: 'tool_call', tool: block.name, input: block.input })
        let toolResult: unknown
        try {
          toolResult = await executeTool(block.name, block.input as ToolInput, sessionId, db)
        } catch (err) {
          toolResult = { error: err instanceof Error ? err.message : 'tool execution failed' }
        }
        if (block.name === 'set_music_mood') {
          send(controller, { type: 'music_mood', mood: (toolResult as { mood: Mood }).mood })
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolResult) })
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
      }

      // Decide whether to continue
      if (response.stop_reason === 'end_turn') {
        continueLoop = false
        send(controller, { type: 'done' })
      } else if (response.stop_reason === 'tool_use' && toolUseBlocks.length === 0) {
        // Malformed response: stop_reason says tool_use but no tool blocks present
        continueLoop = false
        send(controller, { type: 'done' })
      } else if (response.stop_reason !== 'tool_use') {
        continueLoop = false
        send(controller, { type: 'done' })
      }
      // else stop_reason === 'tool_use' and we have tool results — continue loop
    }
  })
}
