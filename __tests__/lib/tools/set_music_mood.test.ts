import { it, expect } from 'vitest'
import { executeSetMusicMood } from '@/lib/tools/set_music_mood'

it('returns an SSE signal with the requested mood', () => {
  const result = executeSetMusicMood({ mood: 'focus' })
  expect(result.sseEvent).toBe('music_mood')
  expect(result.mood).toBe('focus')
})
