'use client'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

export function FocusMode({ children }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <div className={focused ? 'fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center p-6' : 'contents'}>
      <button
        onClick={() => setFocused(f => !f)}
        aria-label="Toggle focus mode"
        aria-pressed={focused}
        className={`${focused ? 'fixed' : 'absolute'} top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors`}
      >
        {focused ? '↙ Exit Focus' : '⛶ Focus Mode'}
      </button>
      {children}
    </div>
  )
}
