import { addNote } from '@/lib/anki'

export async function executeCreateFlashcard(opts: { front: string; back: string }): Promise<{ created: boolean; noteId?: number; error?: string }> {
  const result = await addNote(opts)
  return { created: result.success, noteId: result.noteId, error: result.error }
}
