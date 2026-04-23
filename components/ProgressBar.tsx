'use client'
import { useSessionStore } from '@/store/session'

export function ProgressBar() {
  const { steps, currentStepIndex, topic } = useSessionStore()

  if (!steps.length) return null

  const completedCount = steps.filter(s => s.completed).length
  const percent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium truncate">{topic}</span>
        <span>Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {steps.map((step, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              step.completed ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' :
              i === currentStepIndex ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' :
              'text-gray-400 dark:text-gray-600'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}
