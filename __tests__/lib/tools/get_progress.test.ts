import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initDb, createSession, createTopic, saveProgress } from '@/lib/db'
import { executeGetProgress } from '@/lib/tools/get_progress'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
})
afterEach(() => db.close())

it('returns topics with average scores', () => {
  const topicId = createTopic(db, { name: 'React', parentId: null })
  const s1 = createSession(db, { topic: 'React', mode: 'tutor' })
  saveProgress(db, { sessionId: s1, topicId, score: 70 })
  const result = executeGetProgress(db, { topic: 'React' })
  expect(result.topics.length).toBeGreaterThan(0)
  expect(result.topics[0].name).toBe('React')
  expect(result.topics[0].averageScore).toBe(70)
})
