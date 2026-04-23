import fs from 'fs'
import path from 'path'
import musicConfigData from '../config/music.json'

interface MusicConfig {
  moods: Record<string, { label: string; keywords: string[]; playlistIds: number[] }>
  modeDefaults: Record<string, string>
}

const musicConfig: MusicConfig = musicConfigData

export type Mood = 'focus' | 'chill' | 'upbeat' | 'ambient'

export function getMoodKeywords(mood: Mood): string[] {
  return musicConfig.moods[mood]?.keywords ?? []
}

export function getMoodDefault(mode: 'agent' | 'tutor' | 'quiz' | 'break'): Mood {
  return (musicConfig.modeDefaults[mode] ?? 'chill') as Mood
}

export async function searchPlaylists(keyword: string, limit = 10): Promise<Array<{ id: number; name: string; trackCount: number }>> {
  const { search } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await search({ keywords: keyword, type: 1000, limit, cookie })
  const data = res.body as { result?: { playlists?: Array<{ id: number; name: string; trackCount: number }> } }
  return data.result?.playlists ?? []
}

export async function getPlaylistTracks(playlistId: number, limit = 30): Promise<Array<{ id: number; name: string; ar: Array<{ name: string }> }>> {
  const { playlist_track_all } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await playlist_track_all({ id: playlistId, limit, cookie })
  const data = res.body as { songs?: Array<{ id: number; name: string; ar: Array<{ name: string }> }> }
  return data.songs ?? []
}

export async function getTrackUrl(trackId: number): Promise<string | null> {
  const { song_url_v1 } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await song_url_v1({ id: trackId, level: 'standard' as never, cookie })
  const data = res.body as { data?: Array<{ url: string | null }> }
  return data.data?.[0]?.url ?? null
}

export async function getQrKey(): Promise<string> {
  const { login_qr_key } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_key({})
  const data = res.body as unknown as { data: { unikey: string } }
  return data.data.unikey
}

export async function getQrImage(key: string): Promise<string> {
  const { login_qr_create } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_create({ key, qrimg: true })
  const data = res.body as unknown as { data: { qrimg: string } }
  return data.data.qrimg
}

export async function checkQrStatus(key: string): Promise<{ status: number; cookie?: string }> {
  const { login_qr_check } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_check({ key })
  const data = res.body as unknown as { code: number; cookie?: string }
  return { status: data.code, cookie: data.cookie }
}

export function saveCookie(cookie: string): void {
  const cookiePath = getCookiePath()
  fs.mkdirSync(path.dirname(cookiePath), { recursive: true })
  fs.writeFileSync(cookiePath, cookie, 'utf-8')
}

function getCookiePath(): string {
  return path.join(process.cwd(), process.env.NETEASE_COOKIE_PATH ?? '.netease_cookie')
}

function getCookie(): string {
  try {
    return fs.readFileSync(getCookiePath(), 'utf-8')
  } catch {
    return ''
  }
}
