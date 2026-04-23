import { create } from 'zustand'

export type AppMode = 'tutor' | 'agent'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
}

export interface SessionStep {
  label: string
  completed: boolean
}

interface SessionState {
  topic: string
  mode: AppMode
  sessionId: number | null
  messages: Message[]
  steps: SessionStep[]
  currentStepIndex: number
  isStreaming: boolean
  setTopic: (topic: string) => void
  setMode: (mode: AppMode) => void
  setSessionId: (id: number) => void
  addMessage: (msg: Omit<Message, 'id'>) => void
  setSteps: (steps: string[]) => void
  advanceStep: () => void
  setStreaming: (v: boolean) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  topic: '',
  mode: 'tutor',
  sessionId: null,
  messages: [],
  steps: [],
  currentStepIndex: 0,
  isStreaming: false,
  setTopic: (topic) => set({ topic }),
  setMode: (mode) => set({ mode }),
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: crypto.randomUUID() }],
    })),
  setSteps: (labels) =>
    set({ steps: labels.map((label) => ({ label, completed: false })), currentStepIndex: 0 }),
  advanceStep: () =>
    set((s) => {
      const steps = s.steps.map((step, i) => i === s.currentStepIndex ? { ...step, completed: true } : step)
      return { steps, currentStepIndex: Math.min(s.currentStepIndex + 1, steps.length - 1) }
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  reset: () => set({ topic: '', mode: 'tutor', messages: [], steps: [], currentStepIndex: 0, sessionId: null, isStreaming: false }),
}))
