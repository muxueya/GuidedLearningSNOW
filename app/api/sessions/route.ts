import { NextRequest, NextResponse } from 'next/server'
import { getDb, createSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { topic, mode } = await req.json() as { topic: string; mode: 'tutor' | 'agent' }
  const db = getDb()
  const sessionId = createSession(db, { topic, mode })
  return NextResponse.json({ sessionId })
}
