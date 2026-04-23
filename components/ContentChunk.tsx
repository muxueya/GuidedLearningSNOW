'use client'
import { useEffect, useRef } from 'react'

interface Props {
  content: string
  isStreaming?: boolean
  onComplete?: () => void
}

export function ContentChunk({ content, isStreaming, onComplete }: Props) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (!isStreaming && content && onComplete && !hasFired.current) {
      hasFired.current = true
      onComplete()
    }
  }, [isStreaming, content, onComplete])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl w-full animate-fade-in">
      <p className="text-gray-800 dark:text-gray-100 text-base leading-relaxed whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse rounded-sm" />}
      </p>
    </div>
  )
}
