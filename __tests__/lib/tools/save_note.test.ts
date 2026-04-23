import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initDb, createSession } from '@/lib/db'
import { executeSaveNote } from '@/lib/tools/save_note'

let db: Database.Database
let sessionId: number

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
  sessionId = createSession(db, { topic: 'Test', mode: 'tutor' })
})
afterEach(() => db.close())

it('saves a note and returns confirmation', () => {
  const result = executeSaveNote(db, { sessionId, content: 'React uses virtual DOM' })
  expect(result.saved).toBe(true)
  const notes = db.prepare('SELECT * FROM notes').all()
  expect(notes).toHaveLength(1)
})
