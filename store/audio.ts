import { create } from 'zustand'
import type { Mood } from '@/lib/music'

interface Track {
  id: number
  name: string
  artist: string
  url: string
}

interface AudioState {
  mood: Mood
  track: Track | null
  isPlaying: boolean
  volume: number
  initialized: boolean
  setMood: (mood: Mood) => void
  setTrack: (track: Track) => void
  setPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setInitialized: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  mood: 'chill',
  track: null,
  isPlaying: false,
  volume: 0.5,
  initialized: false,
  setMood: (mood) => set({ mood }),
  setTrack: (track) => set({ track }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setInitialized: () => set({ initialized: true }),
}))
