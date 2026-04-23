import { NextRequest, NextResponse } from 'next/server'
import { getMoodKeywords, searchPlaylists, getPlaylistTracks } from '@/lib/music'
import type { Mood } from '@/lib/music'

export async function GET(req: NextRequest) {
  const VALID_MOODS: Mood[] = ['focus', 'chill', 'upbeat', 'ambient']
  const rawMood = req.nextUrl.searchParams.get('mood') ?? 'chill'
  const mood: Mood = VALID_MOODS.includes(rawMood as Mood) ? (rawMood as Mood) : 'chill'
  const keywords = getMoodKeywords(mood)
  const keyword = keywords[Math.floor(Math.random() * keywords.length)]
  const playlists = await searchPlaylists(keyword, 5)
  if (!playlists.length) return NextResponse.json({ tracks: [] })
  const playlist = playlists[0]
  const tracks = await getPlaylistTracks(playlist.id, 20)
  return NextResponse.json({ playlist: playlist.name, tracks })
}
