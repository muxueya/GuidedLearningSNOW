import { NextRequest, NextResponse } from 'next/server'
import { getDb, createSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  let topic: string
  let mode: 'tutor' | 'agent'

  try {
    const body = await req.json() as { topic?: string; mode?: string }
    topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    mode = body.mode === 'agent' ? 'agent' : 'tutor'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  try {
    const db = getDb()
    const sessionId = createSession(db, { topic, mode })
    return NextResponse.json({ sessionId }, { status: 201 })
  } catch (err) {
    console.error('Failed to create session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
