'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { useAudioStore } from '@/store/audio'
import { ContentChunk } from '@/components/ContentChunk'
import { ProgressBar } from '@/components/ProgressBar'
import { MusicPlayer } from '@/components/MusicPlayer'
import { QuizCard } from '@/components/QuizCard'
import { FocusMode } from '@/components/FocusMode'
import type { Mood } from '@/lib/music'

interface QuizQuestion { question: string; answer: string }

function SessionPageInner() {
  const { topic, mode, sessionId, messages, addMessage, setSteps, advanceStep, setStreaming, isStreaming, steps } = useSessionStore()
  const { setMood } = useAudioStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const durationMins = Number(searchParams.get('duration') ?? '20') || 20
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!topic) { router.replace('/'); return }
    if (mode === 'agent') startAgentSession()
    else startTutorSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function startTutorSession() {
    setSteps(['Introduction', 'Deep Dive', 'Quiz', 'Summary'])
    try {
      await streamChat([{ role: 'user', content: `Start teaching me about "${topic}". Begin with a brief introduction.` }])
    } catch (err) {
      console.error('Tutor session error:', err)
    }
  }

  async function startAgentSession() {
    if (!sessionId) return
    setStreaming(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, sessionId, durationMins }),
      })
      await readSSEStream(res)
    } catch (err) {
      console.error('Agent session error:', err)
    } finally {
      setStreaming(false)
    }
  }

  async function streamChat(msgs: Array<{ role: 'user' | 'assistant'; content: string }>) {
    setStreaming(true)
    setStreamingText('')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, messages: msgs }),
    })
    await readSSEStream(res)
    setStreaming(false)
  }

  async function readSSEStream(res: Response) {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6)) as { type: string; text?: string; mood?: Mood; questions?: QuizQuestion[] }
          if (event.type === 'delta' && event.text) {
            accumulated += event.text
            setStreamingText(accumulated)
          }
          if (event.type === 'text' && event.text) {
            accumulated += event.text
            setStreamingText(accumulated)
          }
          if (event.type === 'music_mood' && event.mood) {
            setMood(event.mood)
          }
          if (event.type === 'quiz' && event.questions?.length) {
            setQuiz(event.questions)
            setQuizIndex(0)
          }
          if (event.type === 'done') {
            if (accumulated) {
              addMessage({ role: 'assistant', content: accumulated })
              setStreamingText('')
              accumulated = ''
            }
            advanceStep()
          }
        } catch {
          // skip malformed SSE line
        }
      }
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    addMessage({ role: 'user', content: text })

    if (text === '/quiz') {
      setSteps([...steps.map(s => s.label), 'Quiz'])
    }

    await streamChat([
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ])
  }

  return (
    <FocusMode>
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex flex-col items-center p-6 gap-4">
        <header className="w-full max-w-2xl flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <MusicPlayer />
        </header>

        <ProgressBar />

        <div className="w-full max-w-2xl flex flex-col gap-4 flex-1">
          {messages.map(msg => (
            msg.role === 'assistant'
              ? <ContentChunk key={msg.id} content={msg.content} />
              : <div key={msg.id} className="self-end bg-indigo-600 text-white px-4 py-2 rounded-2xl text-sm max-w-xs">{msg.content}</div>
          ))}
          {streamingText && <ContentChunk content={streamingText} isStreaming />}
          {quiz.length > 0 && quizIndex < quiz.length && (
            <QuizCard
              question={quiz[quizIndex].question}
              answer={quiz[quizIndex].answer}
              onResult={() => setQuizIndex(i => i + 1)}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {mode === 'tutor' && (
          <div className="w-full max-w-2xl flex gap-2 sticky bottom-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question or type /quiz..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 outline-none focus:ring-2 focus:ring-indigo-400 text-sm disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </main>
    </FocusMode>
  )
}

export default function SessionPage() {
  return (
    <Suspense>
      <SessionPageInner />
    </Suspense>
  )
}
