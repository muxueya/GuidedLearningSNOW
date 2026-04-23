'use client'
import { useState } from 'react'

interface Props {
  question: string
  answer: string
  onResult: (correct: boolean) => void
}

export function QuizCard({ question, answer, onResult }: Props) {
  const [userAnswer, setUserAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  const reveal = () => setRevealed(true)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl w-full space-y-4">
      <p className="font-medium text-gray-800 dark:text-gray-100">{question}</p>
      <textarea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={revealed}
        placeholder="Your answer..."
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {!revealed ? (
        <button onClick={reveal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          Reveal Answer
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-300"><strong>Answer:</strong> {answer}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onResult(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
              ✓ Got it
            </button>
            <button onClick={() => onResult(false)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors">
              ✗ Missed
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
