'use client'
import { useSessionStore, type AppMode } from '@/store/session'

export function ModeToggle() {
  const { mode, setMode } = useSessionStore()

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-sm">
      {(['tutor', 'agent'] as AppMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-4 py-1.5 rounded-full font-medium transition-colors capitalize ${
            mode === m
              ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          {m === 'tutor' ? '💬 Tutor' : '🤖 Agent'}
        </button>
      ))}
    </div>
  )
}
