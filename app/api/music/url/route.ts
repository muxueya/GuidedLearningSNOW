import { NextRequest, NextResponse } from 'next/server'
import { getTrackUrl } from '@/lib/music'

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const url = await getTrackUrl(id)
  if (!url) return NextResponse.json({ error: 'track unavailable' }, { status: 404 })
  return NextResponse.json({ url })
}
