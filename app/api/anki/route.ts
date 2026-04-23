import { NextRequest, NextResponse } from 'next/server'
import { addNote, ensureDeckExists } from '@/lib/anki'
import ankiConfig from '@/config/anki.json'

export async function POST(req: NextRequest) {
  const { front, back } = await req.json() as { front: string; back: string }
  if (!front || !back) return NextResponse.json({ error: 'front and back required' }, { status: 400 })
  await ensureDeckExists(ankiConfig.deck)
  const result = await addNote({ front, back })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ noteId: result.noteId })
}
