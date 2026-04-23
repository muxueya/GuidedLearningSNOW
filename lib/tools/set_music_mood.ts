import type { Mood } from '@/lib/music'

export function executeSetMusicMood(opts: { mood: Mood }): { sseEvent: string; mood: Mood } {
  return { sseEvent: 'music_mood', mood: opts.mood }
}
