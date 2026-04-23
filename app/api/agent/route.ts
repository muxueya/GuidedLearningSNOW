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
import { getDb } from '@/lib/db'
import type Anthropic from '@anthropic-ai/sdk'
import type { Mood } from '@/lib/music'

interface AgentRequest {
  topic: string
  durationMins: number
  sessionId: number
}

type ToolInput = Record<string, unknown>

async function executeTool(name: string, input: ToolInput, sessionId: number): Promise<unknown> {
  const db = getDb()
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
  const { topic, durationMins, sessionId } = await req.json() as AgentRequest

  return makeSSEStream(async (controller) => {
    const system = buildSystemPrompt({ topic, mode: 'agent' })
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Start a ${durationMins}-minute learning session about "${topic}". Begin by checking my progress, then plan and deliver the session.`,
      },
    ]

    let continueLoop = true

    while (continueLoop) {
      const response = await getAnthropic().messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools: TOOL_DEFINITIONS,
        messages,
      })

      for (const block of response.content) {
        if (block.type === 'text') {
          send(controller, { type: 'text', text: block.text })
        }
        if (block.type === 'tool_use') {
          send(controller, { type: 'tool_call', tool: block.name, input: block.input })

          const toolResult = await executeTool(block.name, block.input as ToolInput, sessionId)

          if (block.name === 'set_music_mood') {
            send(controller, { type: 'music_mood', mood: (toolResult as { mood: Mood }).mood })
          }

          messages.push({ role: 'assistant', content: response.content })
          messages.push({
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolResult) }],
          })
          break
        }
      }

      if (response.stop_reason === 'end_turn') {
        continueLoop = false
        send(controller, { type: 'done' })
      } else if (response.stop_reason !== 'tool_use') {
        continueLoop = false
        send(controller, { type: 'done' })
      }
    }
  })
}
