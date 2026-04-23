import Database from 'better-sqlite3'
import { saveNote } from '@/lib/db'

export function executeSaveNote(db: Database.Database, opts: { sessionId: number; content: string }): { saved: boolean } {
  saveNote(db, opts)
  return { saved: true }
}
