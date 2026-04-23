import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from '@/lib/claude'

describe('buildSystemPrompt', () => {
  it('returns an array with cache_control on the last block', () => {
    const blocks = buildSystemPrompt({ topic: 'React hooks', mode: 'tutor' })
    expect(Array.isArray(blocks)).toBe(true)
    expect(blocks.length).toBeGreaterThan(0)
    const last = blocks[blocks.length - 1] as { cache_control?: { type: string } }
    expect(last.cache_control?.type).toBe('ephemeral')
  })

  it('includes the topic in the system prompt text', () => {
    const blocks = buildSystemPrompt({ topic: 'Machine Learning', mode: 'agent' })
    const combined = blocks.map((b: { text?: string }) => b.text ?? '').join(' ')
    expect(combined).toContain('Machine Learning')
  })
})

describe('buildUserMessage', () => {
  it('returns a message with role user', () => {
    const msg = buildUserMessage('Explain closures')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Explain closures')
  })
})
