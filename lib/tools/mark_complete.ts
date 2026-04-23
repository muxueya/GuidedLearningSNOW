import Database from 'better-sqlite3'
import { createTopic, saveProgress } from '@/lib/db'

export function executeMarkComplete(db: Database.Database, opts: { sessionId: number; topicName: string; score: number }): { recorded: boolean } {
  const topicId = createTopic(db, { name: opts.topicName, parentId: null })
  saveProgress(db, { sessionId: opts.sessionId, topicId, score: opts.score })
  return { recorded: true }
}
