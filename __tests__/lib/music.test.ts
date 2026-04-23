import { describe, it, expect } from 'vitest'
import { getMoodKeywords, getMoodDefault } from '@/lib/music'

describe('getMoodKeywords', () => {
  it('returns keywords array for focus mood', () => {
    const kw = getMoodKeywords('focus')
    expect(Array.isArray(kw)).toBe(true)
    expect(kw.length).toBeGreaterThan(0)
  })

  it('returns keywords for all four moods', () => {
    const moods = ['focus', 'chill', 'upbeat', 'ambient'] as const
    for (const mood of moods) {
      expect(getMoodKeywords(mood).length).toBeGreaterThan(0)
    }
  })
})

describe('getMoodDefault', () => {
  it('returns focus for agent mode', () => {
    expect(getMoodDefault('agent')).toBe('focus')
  })

  it('returns chill for tutor mode', () => {
    expect(getMoodDefault('tutor')).toBe('chill')
  })
})
