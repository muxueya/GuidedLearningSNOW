import ankiConfigData from '../config/anki.json'

interface AnkiConfig {
  deck: string
  model: string
  frontField: string
  backField: string
}

const ankiConfig: AnkiConfig = ankiConfigData

const ANKICONNECT_URL = 'http://localhost:8765'

interface AnkiPayload {
  action: string
  version: number
  params: Record<string, unknown>
}

export function buildAddNotePayload(opts: { front: string; back: string }): AnkiPayload {
  return {
    action: 'addNote',
    version: 6,
    params: {
      note: {
        deckName: ankiConfig.deck,
        modelName: ankiConfig.model,
        fields: {
          [ankiConfig.frontField]: opts.front,
          [ankiConfig.backField]: opts.back,
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
  }).catch((err) => {
    console.warn('[AnkiConnect] ensureDeckExists failed:', err)
  })
}
