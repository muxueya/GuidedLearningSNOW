'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Topic { id: number; name: string; averageScore: number; sessionCount: number }
interface Session { id: number; topic: string; mode: string; started_at: number; duration_mins: number | null }

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then(({ topics, sessions }: { topics: Topic[]; sessions: Session[] }) => {
        setTopics(topics)
        setSessions(sessions)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">← Start Learning</Link>
        </header>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {!loading && !error && (
          <>
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Topics</h2>
              {topics.length === 0 ? (
                <p className="text-gray-500 text-sm">No topics studied yet. Start a session!</p>
              ) : (
                <div className="grid gap-3">
                  {topics.map(topic => (
                    <div key={topic.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{topic.name}</span>
                        <span className="text-sm text-gray-400">{topic.sessionCount} session{topic.sessionCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${topic.averageScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-indigo-400 font-semibold w-10 text-right">{topic.averageScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-sm">No sessions yet.</p>
              ) : (
                <div className="grid gap-2">
                  {sessions.map(s => (
                    <div key={s.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-white text-sm font-medium">{s.topic}</span>
                        <span className="ml-2 text-xs text-gray-500 capitalize">{s.mode}</span>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {s.duration_mins ? `${Math.round(s.duration_mins)} min` : 'In progress'}
                        <br />
                        {new Date(s.started_at * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
