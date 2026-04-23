import { describe, it, expect } from 'vitest'
import { buildAddNotePayload } from '@/lib/anki'

describe('buildAddNotePayload', () => {
  it('builds a correctly structured AnkiConnect payload', () => {
    const payload = buildAddNotePayload({ front: 'What is useState?', back: 'A React hook for local state' })
    expect(payload.action).toBe('addNote')
    expect(payload.version).toBe(6)
    const note = payload.params.note as { deckName: string; modelName: string; fields: Record<string, string> }
    expect(note.deckName).toBe('Guided Learning')
    expect(note.modelName).toBe('Basic')
    expect(note.fields.Front).toBe('What is useState?')
    expect(note.fields.Back).toBe('A React hook for local state')
  })
})
