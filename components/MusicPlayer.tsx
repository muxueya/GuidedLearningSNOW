'use client'
import { useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { useAudioStore } from '@/store/audio'
import type { Mood } from '@/lib/music'

async function fetchTrackForMood(mood: Mood): Promise<{ id: number; name: string; artist: string; url: string } | null> {
  const playlistRes = await fetch(`/api/music/playlist?mood=${mood}`)
  const { tracks } = await playlistRes.json() as { tracks: Array<{ id: number; name: string; ar: Array<{ name: string }> }> }
  if (!tracks?.length) return null
  const track = tracks[Math.floor(Math.random() * tracks.length)]
  const urlRes = await fetch(`/api/music/url?id=${track.id}`)
  const { url } = await urlRes.json() as { url: string | null }
  if (!url) return null
  return { id: track.id, name: track.name, artist: track.ar[0]?.name ?? 'Unknown', url }
}

export function MusicPlayer() {
  const { mood, track, isPlaying, volume, initialized, setTrack, setPlaying, setVolume, setInitialized } = useAudioStore()
  const howlRef = useRef<Howl | null>(null)

  const loadAndPlay = useCallback(async (m: Mood) => {
    const newTrack = await fetchTrackForMood(m)
    if (!newTrack) return
    howlRef.current?.fade(volume, 0, 500)
    setTimeout(() => {
      howlRef.current?.unload()
      const howl = new Howl({ src: [newTrack.url], html5: true, volume: 0 })
      howl.once('play', () => howl.fade(0, volume, 2000))
      howl.play()
      howlRef.current = howl
      setTrack(newTrack)
      setPlaying(true)
    }, 600)
  }, [volume, setTrack, setPlaying])

  useEffect(() => {
    if (initialized) loadAndPlay(mood)
  }, [mood, initialized, loadAndPlay])

  useEffect(() => {
    howlRef.current?.volume(volume)
  }, [volume])

  const handleInit = () => {
    setInitialized()
    loadAndPlay(mood)
  }

  const togglePlay = () => {
    if (!howlRef.current) return
    if (isPlaying) { howlRef.current.pause(); setPlaying(false) }
    else { howlRef.current.play(); setPlaying(true) }
  }

  if (!initialized) {
    return (
      <button
        onClick={handleInit}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
      >
        🎵 Start Music
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-sm text-white">
      <button onClick={togglePlay} className="text-lg">
        {isPlaying ? '⏸' : '▶️'}
      </button>
      <div className="truncate max-w-[160px]">
        {track ? `${track.name} — ${track.artist}` : 'Loading...'}
      </div>
      <input
        type="range" min="0" max="1" step="0.05"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="w-16 accent-indigo-400"
      />
    </div>
  )
}
