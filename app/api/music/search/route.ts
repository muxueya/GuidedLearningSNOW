import { NextRequest, NextResponse } from 'next/server'
import { searchPlaylists } from '@/lib/music'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json({ playlists: [] })
  const playlists = await searchPlaylists(q, 10)
  return NextResponse.json({ playlists })
}
