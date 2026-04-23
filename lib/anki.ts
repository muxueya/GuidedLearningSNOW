import fs from 'fs'
import path from 'path'

interface AnkiConfig {
  deck: string
  model: string
  frontField: string
  backField: string
}

function loadConfig(): AnkiConfig {
  const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'anki.json'), 'utf-8')
  return JSON.parse(raw)
}

const ANKICONNECT_URL = 'http://localhost:8765'

interface AnkiPayload {
  action: string
  version: number
  params: Record<string, unknown>
}

export function buildAddNotePayload(opts: { front: string; back: string }): AnkiPayload {
  const config = loadConfig()
  return {
    action: 'addNote',
    version: 6,
    params: {
      note: {
        deckName: config.deck,
        modelName: config.model,
        fields: {
          [config.frontField]: opts.front,
          [config.backField]: opts.back,
        },
        options: { allowDuplicate: false },
        tags: ['guided-learning'],
      },
    },
  }
}

export async function addNote(opts: { front: string; back: string }): Promise<{ success: boolean; noteId?: number; error?: string }> {
  const payload = buildAddNotePayload(opts)
  try {
    const res = await fetch(ANKICONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json() as { result: number | null; error: string | null }
    if (data.error) return { success: false, error: data.error }
    return { success: true, noteId: data.result ?? undefined }
  } catch {
    return { success: false, error: 'AnkiConnect not reachable — is Anki open?' }
  }
}

export async function ensureDeckExists(deckName: string): Promise<void> {
  await fetch(ANKICONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createDeck', version: 6, params: { deck: deckName } }),
  }).catch(() => {})
}
