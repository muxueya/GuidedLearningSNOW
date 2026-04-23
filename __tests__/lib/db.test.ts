import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initDb, createSession, createTopic, saveProgress, saveNote, saveQuizResult, getTopicProgress } from '@/lib/db'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
})

afterEach(() => {
  db.close()
})

describe('initDb', () => {
  it('creates all required tables', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain('sessions')
    expect(names).toContain('topics')
    expect(names).toContain('progress')
    expect(names).toContain('notes')
    expect(names).toContain('quiz_results')
  })
})

describe('createSession', () => {
  it('returns a numeric session id', () => {
    const id = createSession(db, { topic: 'React hooks', mode: 'tutor' })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })
})

describe('createTopic', () => {
  it('creates a topic and returns id', () => {
    const id = createTopic(db, { name: 'React hooks', parentId: null })
    expect(typeof id).toBe('number')
  })

  it('creates a subtopic with parentId', () => {
    const parentId = createTopic(db, { name: 'React', parentId: null })
    const childId = createTopic(db, { name: 'useState', parentId })
    expect(childId).toBeGreaterThan(parentId)
  })
})

describe('saveProgress', () => {
  it('saves a progress record', () => {
    const sessionId = createSession(db, { topic: 'React', mode: 'agent' })
    const topicId = createTopic(db, { name: 'React', parentId: null })
    saveProgress(db, { sessionId, topicId, score: 80 })
    const rows = db.prepare('SELECT * FROM progress').all()
    expect(rows).toHaveLength(1)
  })
})

describe('getTopicProgress', () => {
  it('returns average score across sessions for a topic', () => {
    const topicId = createTopic(db, { name: 'React', parentId: null })
    const s1 = createSession(db, { topic: 'React', mode: 'tutor' })
    const s2 = createSession(db, { topic: 'React', mode: 'agent' })
    saveProgress(db, { sessionId: s1, topicId, score: 60 })
    saveProgress(db, { sessionId: s2, topicId, score: 80 })
    const result = getTopicProgress(db, topicId)
    expect(result.averageScore).toBe(70)
    expect(result.sessionCount).toBe(2)
  })
})
