import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'guided-learning.db')

export function getDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  initDb(db)
  return db
}

export function initDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('tutor', 'agent')),
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      ended_at INTEGER,
      duration_mins REAL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER REFERENCES topics(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      completed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      correct INTEGER NOT NULL CHECK(correct IN (0, 1)),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)
}

export function createSession(db: Database.Database, opts: { topic: string; mode: 'tutor' | 'agent' }): number {
  const result = db.prepare('INSERT INTO sessions (topic, mode) VALUES (?, ?)').run(opts.topic, opts.mode)
  return result.lastInsertRowid as number
}

export function endSession(db: Database.Database, sessionId: number, durationMins: number): void {
  db.prepare('UPDATE sessions SET ended_at = unixepoch(), duration_mins = ? WHERE id = ?').run(durationMins, sessionId)
}

export function createTopic(db: Database.Database, opts: { name: string; parentId: number | null }): number {
  const existing = db.prepare('SELECT id FROM topics WHERE name = ?').get(opts.name) as { id: number } | undefined
  if (existing) return existing.id
  const result = db.prepare('INSERT INTO topics (name, parent_id) VALUES (?, ?)').run(opts.name, opts.parentId)
  return result.lastInsertRowid as number
}

export function saveProgress(db: Database.Database, opts: { sessionId: number; topicId: number; score: number }): void {
  db.prepare('INSERT INTO progress (session_id, topic_id, score) VALUES (?, ?, ?)').run(opts.sessionId, opts.topicId, opts.score)
}

export function saveNote(db: Database.Database, opts: { sessionId: number; content: string }): void {
  db.prepare('INSERT INTO notes (session_id, content) VALUES (?, ?)').run(opts.sessionId, opts.content)
}

export function saveQuizResult(db: Database.Database, opts: { sessionId: number; question: string; answer: string; correct: boolean }): void {
  db.prepare('INSERT INTO quiz_results (session_id, question, answer, correct) VALUES (?, ?, ?, ?)').run(opts.sessionId, opts.question, opts.answer, opts.correct ? 1 : 0)
}

export function getTopicProgress(db: Database.Database, topicId: number): { averageScore: number; sessionCount: number } {
  const row = db.prepare(`
    SELECT AVG(score) as avg, COUNT(*) as cnt
    FROM progress WHERE topic_id = ?
  `).get(topicId) as { avg: number | null; cnt: number }
  return { averageScore: Math.round(row.avg ?? 0), sessionCount: row.cnt }
}

export function getAllTopicsWithProgress(db: Database.Database): Array<{ id: number; name: string; averageScore: number; sessionCount: number }> {
  return db.prepare(`
    SELECT t.id, t.name,
      ROUND(AVG(p.score), 0) as averageScore,
      COUNT(p.id) as sessionCount
    FROM topics t
    LEFT JOIN progress p ON p.topic_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `).all() as Array<{ id: number; name: string; averageScore: number; sessionCount: number }>
}

export function getRecentSessions(db: Database.Database, limit = 10): Array<{ id: number; topic: string; mode: string; started_at: number; duration_mins: number | null }> {
  return db.prepare(`
    SELECT id, topic, mode, started_at, duration_mins
    FROM sessions ORDER BY started_at DESC LIMIT ?
  `).all(limit) as Array<{ id: number; topic: string; mode: string; started_at: number; duration_mins: number | null }>
}
