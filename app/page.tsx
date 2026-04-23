'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/store/session'
import { ModeToggle } from '@/components/ModeToggle'
import { MusicPlayer } from '@/components/MusicPlayer'

export default function HomePage() {
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(20)
  const { mode, setTopic: storeTopic } = useSessionStore()
  const router = useRouter()

  const start = async () => {
    if (!topic.trim()) return
    storeTopic(topic.trim())
    const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, mode }) })
    const { sessionId } = await res.json() as { sessionId: number }
    useSessionStore.getState().setSessionId(sessionId)
    router.push(`/session?duration=${duration}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">Guided Learning</h1>
        <p className="text-gray-400 text-sm">AI-powered sessions with music therapy</p>
      </div>
      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
          placeholder="What do you want to learn today?"
          className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 outline-none focus:ring-2 focus:ring-indigo-400 text-base"
          autoFocus
        />
        <div className="flex items-center justify-between gap-4">
          <ModeToggle />
          {mode === 'agent' && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Duration:</span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                {[10, 15, 20, 30, 45].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={start}
          disabled={!topic.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start Session →
        </button>
        <Link href="/dashboard" className="block text-center text-xs text-gray-600 hover:text-gray-400 transition-colors">
          View progress dashboard →
        </Link>
      </div>
      <MusicPlayer />
    </main>
  )
}
