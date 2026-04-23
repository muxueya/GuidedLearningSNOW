import { NextResponse } from 'next/server'
import { getDb, getAllTopicsWithProgress, getRecentSessions } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const topics = getAllTopicsWithProgress(db)
    const sessions = getRecentSessions(db, 10)
    return NextResponse.json({ topics, sessions })
  } catch (err) {
    console.error('Dashboard fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
