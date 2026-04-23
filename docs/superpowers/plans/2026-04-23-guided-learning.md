# Guided Learning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal, ADHD-friendly learning tool pairing Claude AI (tutor + agent modes) with NetEase Cloud Music and automatic Anki flashcard creation.

**Architecture:** Next.js 14 App Router full-stack app running on localhost. Claude API handles streaming chat (tutor mode) and tool_use agentic loops (agent mode). Music streams from NetEase via server-side NeteaseCloudMusicApi Node package. Progress stored in SQLite. Flashcards pushed to Anki desktop via AnkiConnect HTTP API on localhost:8765.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Howler.js, Anthropic SDK (`@anthropic-ai/sdk`), Zustand, better-sqlite3, NeteaseCloudMusicApi, Vitest

---

## File Map

```
/app
  layout.tsx                     — root layout, global font + Tailwind
  page.tsx                       — home: topic input + mode select
  /session/page.tsx              — learning session UI
  /dashboard/page.tsx            — progress dashboard
  /api/chat/route.ts             — tutor mode SSE endpoint
  /api/agent/route.ts            — agent mode tool_use loop endpoint
  /api/music/playlist/route.ts   — NetEase playlist for a mood
  /api/music/url/route.ts        — NetEase stream URL for a track ID
  /api/music/search/route.ts     — NetEase keyword search
  /api/music/login/route.ts      — NetEase QR login flow
  /api/anki/route.ts             — AnkiConnect proxy

/lib
  db.ts                          — SQLite client + schema init
  claude.ts                      — Anthropic SDK client, system prompt builder, stream helpers
  music.ts                       — NeteaseCloudMusicApi wrapper + mood→keyword mapping
  anki.ts                        — AnkiConnect HTTP client
  /tools
    index.ts                     — tool definitions array (passed to Claude)
    search_web.ts                — Brave Search API call
    save_note.ts                 — SQLite write
    get_progress.ts              — SQLite read, returns topic scores
    generate_quiz.ts             — returns structured quiz JSON to Claude
    set_music_mood.ts            — returns SSE signal object
    mark_complete.ts             — SQLite write, session score
    create_flashcard.ts          — AnkiConnect card push

/store
  session.ts                     — Zustand: session state, messages, progress steps
  audio.ts                       — Zustand: now playing, mood, Howler instance

/components
  ContentChunk.tsx               — single 250-word learning card
  ProgressBar.tsx                — step N of M + topic level bar
  ModeToggle.tsx                 — tutor ↔ agent switch
  MusicPlayer.tsx                — mini-player: track name, play/pause, volume
  QuizCard.tsx                   — single quiz question + answer reveal
  FocusMode.tsx                  — wrapper that hides UI chrome

/config
  music.json                     — mood → NetEase keyword mapping
  anki.json                      — deck name, card model name

/__tests__
  lib/db.test.ts
  lib/claude.test.ts
  lib/anki.test.ts
  lib/music.test.ts
  lib/tools/save_note.test.ts
  lib/tools/get_progress.test.ts
  lib/tools/set_music_mood.test.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd "/Users/qianxingyan/Oslo/Projects/Guided Learning"
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install \
  @anthropic-ai/sdk \
  better-sqlite3 \
  howler \
  zustand \
  NeteaseCloudMusicApi \
  clsx

npm install --save-dev \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  @types/better-sqlite3 \
  @types/howler \
  jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
ANTHROPIC_API_KEY=your_key_here
BRAVE_SEARCH_API_KEY=your_key_here
NETEASE_COOKIE_PATH=.netease_cookie
EOF
cp .env.local.example .env.local
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: server running on http://localhost:3000

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps and Vitest"
```

---

## Task 2: Config Files

**Files:**
- Create: `config/music.json`, `config/anki.json`

- [ ] **Step 1: Create config directory and music.json**

```bash
mkdir -p config
```

Create `config/music.json`:

```json
{
  "moods": {
    "focus": {
      "label": "Deep Focus",
      "keywords": ["专注", "纯音乐", "study instrumental"],
      "playlistIds": []
    },
    "chill": {
      "label": "Lo-fi Chill",
      "keywords": ["lofi", "放松", "轻音乐"],
      "playlistIds": []
    },
    "upbeat": {
      "label": "Upbeat",
      "keywords": ["欢快", "轻快", "positive"],
      "playlistIds": []
    },
    "ambient": {
      "label": "Ambient",
      "keywords": ["冥想", "自然声音", "ambient"],
      "playlistIds": []
    }
  },
  "modeDefaults": {
    "agent": "focus",
    "tutor": "chill",
    "quiz": "upbeat",
    "break": "ambient"
  }
}
```

- [ ] **Step 2: Create config/anki.json**

```json
{
  "deck": "Guided Learning",
  "model": "Basic",
  "frontField": "Front",
  "backField": "Back"
}
```

- [ ] **Step 3: Commit**

```bash
git add config/
git commit -m "feat: add music mood and anki config files"
```

---

## Task 3: Database Layer

**Files:**
- Create: `lib/db.ts`, `__tests__/lib/db.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/db.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- db
```
Expected: FAIL — `Cannot find module '@/lib/db'`

- [ ] **Step 3: Implement lib/db.ts**

Create `lib/db.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- db
```
Expected: PASS — all 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts __tests__/lib/db.test.ts
git commit -m "feat: add SQLite database layer with schema and CRUD helpers"
```

---

## Task 4: Music Library

**Files:**
- Create: `lib/music.ts`, `app/api/music/playlist/route.ts`, `app/api/music/url/route.ts`, `app/api/music/search/route.ts`, `app/api/music/login/route.ts`, `__tests__/lib/music.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/music.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getMoodKeywords, getMoodDefault } from '@/lib/music'

describe('getMoodKeywords', () => {
  it('returns keywords array for focus mood', () => {
    const kw = getMoodKeywords('focus')
    expect(Array.isArray(kw)).toBe(true)
    expect(kw.length).toBeGreaterThan(0)
  })

  it('returns keywords for all four moods', () => {
    const moods = ['focus', 'chill', 'upbeat', 'ambient'] as const
    for (const mood of moods) {
      expect(getMoodKeywords(mood).length).toBeGreaterThan(0)
    }
  })
})

describe('getMoodDefault', () => {
  it('returns focus for agent mode', () => {
    expect(getMoodDefault('agent')).toBe('focus')
  })

  it('returns chill for tutor mode', () => {
    expect(getMoodDefault('tutor')).toBe('chill')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- music
```
Expected: FAIL — `Cannot find module '@/lib/music'`

- [ ] **Step 3: Implement lib/music.ts**

Create `lib/music.ts`:

```typescript
import fs from 'fs'
import path from 'path'

interface MusicConfig {
  moods: Record<string, { label: string; keywords: string[]; playlistIds: number[] }>
  modeDefaults: Record<string, string>
}

export type Mood = 'focus' | 'chill' | 'upbeat' | 'ambient'

function loadConfig(): MusicConfig {
  const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'music.json'), 'utf-8')
  return JSON.parse(raw)
}

export function getMoodKeywords(mood: Mood): string[] {
  const config = loadConfig()
  return config.moods[mood]?.keywords ?? []
}

export function getMoodDefault(mode: 'agent' | 'tutor' | 'quiz' | 'break'): Mood {
  const config = loadConfig()
  return (config.modeDefaults[mode] ?? 'chill') as Mood
}

export async function searchPlaylists(keyword: string, limit = 10): Promise<Array<{ id: number; name: string; trackCount: number }>> {
  const { search } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await search({ keywords: keyword, type: 1000, limit, cookie })
  const data = res.body as { result?: { playlists?: Array<{ id: number; name: string; trackCount: number }> } }
  return data.result?.playlists ?? []
}

export async function getPlaylistTracks(playlistId: number, limit = 30): Promise<Array<{ id: number; name: string; ar: Array<{ name: string }> }>> {
  const { playlist_track_all } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await playlist_track_all({ id: playlistId, limit, cookie })
  const data = res.body as { songs?: Array<{ id: number; name: string; ar: Array<{ name: string }> }> }
  return data.songs ?? []
}

export async function getTrackUrl(trackId: number): Promise<string | null> {
  const { song_url_v1 } = await import('NeteaseCloudMusicApi')
  const cookie = getCookie()
  const res = await song_url_v1({ id: trackId, level: 'standard', cookie })
  const data = res.body as { data?: Array<{ url: string | null }> }
  return data.data?.[0]?.url ?? null
}

export async function getQrKey(): Promise<string> {
  const { login_qr_key } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_key({ timestamp: Date.now() })
  const data = res.body as { data: { unikey: string } }
  return data.data.unikey
}

export async function getQrImage(key: string): Promise<string> {
  const { login_qr_create } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_create({ key, qrimg: true, timestamp: Date.now() })
  const data = res.body as { data: { qrimg: string } }
  return data.data.qrimg
}

export async function checkQrStatus(key: string): Promise<{ status: number; cookie?: string }> {
  const { login_qr_check } = await import('NeteaseCloudMusicApi')
  const res = await login_qr_check({ key, timestamp: Date.now() })
  const data = res.body as { code: number; cookie?: string }
  return { status: data.code, cookie: data.cookie }
}

export function saveCookie(cookie: string): void {
  const cookiePath = getCookiePath()
  fs.mkdirSync(path.dirname(cookiePath), { recursive: true })
  fs.writeFileSync(cookiePath, cookie, 'utf-8')
}

function getCookiePath(): string {
  return path.join(process.cwd(), process.env.NETEASE_COOKIE_PATH ?? '.netease_cookie')
}

function getCookie(): string {
  try {
    return fs.readFileSync(getCookiePath(), 'utf-8')
  } catch {
    return ''
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- music
```
Expected: PASS

- [ ] **Step 5: Create music API routes**

Create `app/api/music/playlist/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMoodKeywords, searchPlaylists, getPlaylistTracks } from '@/lib/music'
import type { Mood } from '@/lib/music'

export async function GET(req: NextRequest) {
  const mood = (req.nextUrl.searchParams.get('mood') ?? 'chill') as Mood
  const keywords = getMoodKeywords(mood)
  const keyword = keywords[Math.floor(Math.random() * keywords.length)]
  const playlists = await searchPlaylists(keyword, 5)
  if (!playlists.length) return NextResponse.json({ tracks: [] })
  const playlist = playlists[0]
  const tracks = await getPlaylistTracks(playlist.id, 20)
  return NextResponse.json({ playlist: playlist.name, tracks })
}
```

Create `app/api/music/url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTrackUrl } from '@/lib/music'

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const url = await getTrackUrl(id)
  if (!url) return NextResponse.json({ error: 'track unavailable' }, { status: 404 })
  return NextResponse.json({ url })
}
```

Create `app/api/music/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchPlaylists } from '@/lib/music'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json({ playlists: [] })
  const playlists = await searchPlaylists(q, 10)
  return NextResponse.json({ playlists })
}
```

Create `app/api/music/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getQrKey, getQrImage, checkQrStatus, saveCookie } from '@/lib/music'

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'qr') {
    const key = await getQrKey()
    const qrimg = await getQrImage(key)
    return NextResponse.json({ key, qrimg })
  }
  if (action === 'check') {
    const key = req.nextUrl.searchParams.get('key') ?? ''
    const { status, cookie } = await checkQrStatus(key)
    if (status === 803 && cookie) saveCookie(cookie)
    return NextResponse.json({ status })
  }
  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/music.ts app/api/music/ __tests__/lib/music.test.ts
git commit -m "feat: add NetEase music library and API routes"
```

---

## Task 5: Anki Library

**Files:**
- Create: `lib/anki.ts`, `app/api/anki/route.ts`, `__tests__/lib/anki.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/anki.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildAddNotePayload } from '@/lib/anki'

describe('buildAddNotePayload', () => {
  it('builds a correctly structured AnkiConnect payload', () => {
    const payload = buildAddNotePayload({ front: 'What is useState?', back: 'A React hook for local state' })
    expect(payload.action).toBe('addNote')
    expect(payload.version).toBe(6)
    expect(payload.params.note.deckName).toBe('Guided Learning')
    expect(payload.params.note.modelName).toBe('Basic')
    expect(payload.params.note.fields.Front).toBe('What is useState?')
    expect(payload.params.note.fields.Back).toBe('A React hook for local state')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- anki
```
Expected: FAIL — `Cannot find module '@/lib/anki'`

- [ ] **Step 3: Implement lib/anki.ts**

Create `lib/anki.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- anki
```
Expected: PASS

- [ ] **Step 5: Create /api/anki route**

Create `app/api/anki/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { addNote, ensureDeckExists } from '@/lib/anki'
import ankiConfig from '@/config/anki.json'

export async function POST(req: NextRequest) {
  const { front, back } = await req.json() as { front: string; back: string }
  if (!front || !back) return NextResponse.json({ error: 'front and back required' }, { status: 400 })
  await ensureDeckExists(ankiConfig.deck)
  const result = await addNote({ front, back })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ noteId: result.noteId })
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/anki.ts app/api/anki/ __tests__/lib/anki.test.ts
git commit -m "feat: add AnkiConnect library and API route"
```

---

## Task 6: Claude Library

**Files:**
- Create: `lib/claude.ts`, `__tests__/lib/claude.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/claude.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from '@/lib/claude'

describe('buildSystemPrompt', () => {
  it('returns an array with cache_control on the last block', () => {
    const blocks = buildSystemPrompt({ topic: 'React hooks', mode: 'tutor' })
    expect(Array.isArray(blocks)).toBe(true)
    expect(blocks.length).toBeGreaterThan(0)
    const last = blocks[blocks.length - 1] as { cache_control?: { type: string } }
    expect(last.cache_control?.type).toBe('ephemeral')
  })

  it('includes the topic in the system prompt text', () => {
    const blocks = buildSystemPrompt({ topic: 'Machine Learning', mode: 'agent' })
    const combined = blocks.map((b: { text?: string }) => b.text ?? '').join(' ')
    expect(combined).toContain('Machine Learning')
  })
})

describe('buildUserMessage', () => {
  it('returns a message with role user', () => {
    const msg = buildUserMessage('Explain closures')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Explain closures')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- claude
```
Expected: FAIL — `Cannot find module '@/lib/claude'`

- [ ] **Step 3: Implement lib/claude.ts**

Create `lib/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODEL = 'claude-sonnet-4-6'
export const MAX_TOKENS = 1024

export function buildSystemPrompt(opts: { topic: string; mode: 'tutor' | 'agent' }): Anthropic.TextBlockParam[] {
  const persona = `You are an expert tutor helping a user with light ADHD learn about "${opts.topic}".
Keep all responses concise — maximum 250 words per message. One idea per message. Never write walls of text.
Always signal what comes next at the end of each message (e.g., "Next: I'll cover X" or "Ready for a quick quiz?").
Adapt to the user's pace. Be encouraging, clear, and direct.`

  const modeInstructions =
    opts.mode === 'agent'
      ? `You are running in AGENT MODE. You drive the session autonomously. Plan a curriculum, deliver it in chunks, quiz the user between subtopics, and create flashcards. Use your tools proactively.`
      : `You are running in TUTOR MODE. Answer the user's questions, explain concepts clearly, and suggest moving forward when appropriate. When the user types /quiz, generate a quiz immediately.`

  return [
    {
      type: 'text',
      text: persona,
    },
    {
      type: 'text',
      text: modeInstructions,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

export function buildUserMessage(content: string): { role: 'user'; content: string } {
  return { role: 'user', content }
}

export function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export function makeSSEStream(
  fn: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await fn(controller)
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export function send(controller: ReadableStreamDefaultController<Uint8Array>, data: unknown): void {
  const encoder = new TextEncoder()
  controller.enqueue(encoder.encode(encodeSSE(data)))
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- claude
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts __tests__/lib/claude.test.ts
git commit -m "feat: add Claude API client with prompt caching and SSE helpers"
```

---

## Task 7: Agent Tools

**Files:**
- Create: `lib/tools/index.ts`, `lib/tools/search_web.ts`, `lib/tools/save_note.ts`, `lib/tools/get_progress.ts`, `lib/tools/generate_quiz.ts`, `lib/tools/set_music_mood.ts`, `lib/tools/mark_complete.ts`, `lib/tools/create_flashcard.ts`
- Create: `__tests__/lib/tools/save_note.test.ts`, `__tests__/lib/tools/get_progress.test.ts`, `__tests__/lib/tools/set_music_mood.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/tools/save_note.test.ts`:

```typescript
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
```

Create `__tests__/lib/tools/get_progress.test.ts`:

```typescript
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
```

Create `__tests__/lib/tools/set_music_mood.test.ts`:

```typescript
import { it, expect } from 'vitest'
import { executeSetMusicMood } from '@/lib/tools/set_music_mood'

it('returns an SSE signal with the requested mood', () => {
  const result = executeSetMusicMood({ mood: 'focus' })
  expect(result.sseEvent).toBe('music_mood')
  expect(result.mood).toBe('focus')
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- tools
```
Expected: FAIL — modules not found

- [ ] **Step 3: Implement tools**

Create `lib/tools/save_note.ts`:

```typescript
import Database from 'better-sqlite3'
import { saveNote } from '@/lib/db'

export function executeSaveNote(db: Database.Database, opts: { sessionId: number; content: string }): { saved: boolean } {
  saveNote(db, opts)
  return { saved: true }
}
```

Create `lib/tools/get_progress.ts`:

```typescript
import Database from 'better-sqlite3'

export function executeGetProgress(db: Database.Database, opts: { topic: string }): {
  topics: Array<{ name: string; averageScore: number; sessionCount: number }>
} {
  const rows = db.prepare(`
    SELECT t.name,
      ROUND(AVG(p.score), 0) as averageScore,
      COUNT(p.id) as sessionCount
    FROM topics t
    LEFT JOIN progress p ON p.topic_id = t.id
    WHERE t.name LIKE ?
    GROUP BY t.id
    ORDER BY t.name
  `).all(`%${opts.topic}%`) as Array<{ name: string; averageScore: number; sessionCount: number }>
  return { topics: rows }
}
```

Create `lib/tools/set_music_mood.ts`:

```typescript
import type { Mood } from '@/lib/music'

export function executeSetMusicMood(opts: { mood: Mood }): { sseEvent: string; mood: Mood } {
  return { sseEvent: 'music_mood', mood: opts.mood }
}
```

Create `lib/tools/mark_complete.ts`:

```typescript
import Database from 'better-sqlite3'
import { createTopic, saveProgress } from '@/lib/db'

export function executeMarkComplete(db: Database.Database, opts: { sessionId: number; topicName: string; score: number }): { recorded: boolean } {
  const topicId = createTopic(db, { name: opts.topicName, parentId: null })
  saveProgress(db, { sessionId: opts.sessionId, topicId, score: opts.score })
  return { recorded: true }
}
```

Create `lib/tools/generate_quiz.ts`:

```typescript
export function executeGenerateQuiz(_opts: { subtopic: string; questionCount: number }): { instruction: string } {
  return {
    instruction: `Generate ${_opts.questionCount} quiz questions about "${_opts.subtopic}". Return as JSON array: [{"question": "...", "answer": "...", "type": "short"}]. Present each question to the user one at a time, wait for their answer, then reveal the correct answer before moving to the next.`,
  }
}
```

Create `lib/tools/search_web.ts`:

```typescript
export async function executeSearchWeb(opts: { query: string; limit?: number }): Promise<{ results: Array<{ title: string; url: string; snippet: string }> }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return { results: [] }
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(opts.query)}&count=${opts.limit ?? 5}`
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } })
  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } }
  return {
    results: (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.description })),
  }
}
```

Create `lib/tools/create_flashcard.ts`:

```typescript
import { addNote } from '@/lib/anki'

export async function executeCreateFlashcard(opts: { front: string; back: string }): Promise<{ created: boolean; noteId?: number; error?: string }> {
  const result = await addNote(opts)
  return { created: result.success, noteId: result.noteId, error: result.error }
}
```

- [ ] **Step 4: Create tool definitions index**

Create `lib/tools/index.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for current information on a topic using Brave Search.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_note',
    description: 'Persist a learning note for the current session.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Note content to save' },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_progress',
    description: "Retrieve the user's learning history and scores for a topic.",
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic name to look up (partial match)' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_quiz',
    description: 'Generate quiz questions on a subtopic. Returns instructions for how to run the quiz interactively.',
    input_schema: {
      type: 'object',
      properties: {
        subtopic: { type: 'string', description: 'The subtopic to quiz on' },
        questionCount: { type: 'number', description: 'Number of questions (3-5)' },
      },
      required: ['subtopic', 'questionCount'],
    },
  },
  {
    name: 'set_music_mood',
    description: 'Change the background music mood. Call this when transitioning between learning phases.',
    input_schema: {
      type: 'object',
      properties: {
        mood: { type: 'string', enum: ['focus', 'chill', 'upbeat', 'ambient'], description: 'Music mood' },
      },
      required: ['mood'],
    },
  },
  {
    name: 'mark_complete',
    description: 'Log that a subtopic is complete with a score.',
    input_schema: {
      type: 'object',
      properties: {
        topicName: { type: 'string', description: 'Name of the completed topic' },
        score: { type: 'number', description: 'Score 0-100 based on quiz performance' },
      },
      required: ['topicName', 'score'],
    },
  },
  {
    name: 'create_flashcard',
    description: 'Push a flashcard to Anki via AnkiConnect. Call after covering an important concept.',
    input_schema: {
      type: 'object',
      properties: {
        front: { type: 'string', description: 'Question or concept on the front of the card' },
        back: { type: 'string', description: 'Answer or explanation on the back' },
      },
      required: ['front', 'back'],
    },
  },
]
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test -- tools
```
Expected: PASS — all 3 tool tests

- [ ] **Step 6: Commit**

```bash
git add lib/tools/ __tests__/lib/tools/
git commit -m "feat: add 7 agent tools with definitions and unit tests"
```

---

## Task 8: Chat API Route (Tutor Mode)

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Implement /api/chat SSE route**

Create `app/api/chat/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { anthropic, MODEL, MAX_TOKENS, buildSystemPrompt, makeSSEStream, send } from '@/lib/claude'
import type { Anthropic } from '@anthropic-ai/sdk'

interface ChatRequest {
  topic: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(req: NextRequest) {
  const { topic, messages } = await req.json() as ChatRequest

  return makeSSEStream(async (controller) => {
    const system = buildSystemPrompt({ topic, mode: 'tutor' })

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: messages as Anthropic.MessageParam[],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send(controller, { type: 'delta', text: event.delta.text })
      }
      if (event.type === 'message_stop') {
        send(controller, { type: 'done' })
      }
    }
  })
}
```

- [ ] **Step 2: Manual smoke test**

Start the dev server and run from terminal:

```bash
npm run dev &
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"topic":"React hooks","messages":[{"role":"user","content":"Explain useState in one sentence"}]}' \
  --no-buffer
```
Expected: SSE events streaming with `data: {"type":"delta","text":"..."}` lines, ending with `data: {"type":"done"}`

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/
git commit -m "feat: add /api/chat SSE route for tutor mode"
```

---

## Task 9: Agent API Route (Agent Mode)

**Files:**
- Create: `app/api/agent/route.ts`

- [ ] **Step 1: Implement /api/agent tool_use loop route**

Create `app/api/agent/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { anthropic, MODEL, buildSystemPrompt, makeSSEStream, send } from '@/lib/claude'
import { TOOL_DEFINITIONS } from '@/lib/tools'
import { executeSearchWeb } from '@/lib/tools/search_web'
import { executeSaveNote } from '@/lib/tools/save_note'
import { executeGetProgress } from '@/lib/tools/get_progress'
import { executeGenerateQuiz } from '@/lib/tools/generate_quiz'
import { executeSetMusicMood } from '@/lib/tools/set_music_mood'
import { executeMarkComplete } from '@/lib/tools/mark_complete'
import { executeCreateFlashcard } from '@/lib/tools/create_flashcard'
import { getDb } from '@/lib/db'
import type { Anthropic } from '@anthropic-ai/sdk'
import type { Mood } from '@/lib/music'

interface AgentRequest {
  topic: string
  durationMins: number
  sessionId: number
}

type ToolInput = Record<string, unknown>

async function executeTool(name: string, input: ToolInput, sessionId: number): Promise<unknown> {
  const db = getDb()
  switch (name) {
    case 'search_web':
      return executeSearchWeb({ query: input.query as string, limit: input.limit as number | undefined })
    case 'save_note':
      return executeSaveNote(db, { sessionId, content: input.content as string })
    case 'get_progress':
      return executeGetProgress(db, { topic: input.topic as string })
    case 'generate_quiz':
      return executeGenerateQuiz({ subtopic: input.subtopic as string, questionCount: input.questionCount as number })
    case 'set_music_mood':
      return executeSetMusicMood({ mood: input.mood as Mood })
    case 'mark_complete':
      return executeMarkComplete(db, { sessionId, topicName: input.topicName as string, score: input.score as number })
    case 'create_flashcard':
      return executeCreateFlashcard({ front: input.front as string, back: input.back as string })
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(req: NextRequest) {
  const { topic, durationMins, sessionId } = await req.json() as AgentRequest

  return makeSSEStream(async (controller) => {
    const system = buildSystemPrompt({ topic, mode: 'agent' })
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Start a ${durationMins}-minute learning session about "${topic}". Begin by checking my progress, then plan and deliver the session.`,
      },
    ]

    let continueLoop = true

    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools: TOOL_DEFINITIONS,
        messages,
      })

      for (const block of response.content) {
        if (block.type === 'text') {
          send(controller, { type: 'text', text: block.text })
        }
        if (block.type === 'tool_use') {
          send(controller, { type: 'tool_call', tool: block.name, input: block.input })

          const toolResult = await executeTool(block.name, block.input as ToolInput, sessionId)

          if (block.name === 'set_music_mood') {
            send(controller, { type: 'music_mood', mood: (toolResult as { mood: Mood }).mood })
          }

          messages.push({ role: 'assistant', content: response.content })
          messages.push({
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolResult) }],
          })
          break
        }
      }

      if (response.stop_reason === 'end_turn') {
        continueLoop = false
        send(controller, { type: 'done' })
      } else if (response.stop_reason !== 'tool_use') {
        continueLoop = false
        send(controller, { type: 'done' })
      }
    }
  })
}
```

- [ ] **Step 2: Manual smoke test**

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"topic":"Python basics","durationMins":10,"sessionId":1}' \
  --no-buffer
```
Expected: SSE stream showing `tool_call` events interspersed with `text` events, finishing with `done`

- [ ] **Step 3: Commit**

```bash
git add app/api/agent/
git commit -m "feat: add /api/agent tool_use agentic loop route"
```

---

## Task 10: Zustand Stores

**Files:**
- Create: `store/session.ts`, `store/audio.ts`

- [ ] **Step 1: Implement session store**

Create `store/session.ts`:

```typescript
import { create } from 'zustand'

export type AppMode = 'tutor' | 'agent'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
}

export interface SessionStep {
  label: string
  completed: boolean
}

interface SessionState {
  topic: string
  mode: AppMode
  sessionId: number | null
  messages: Message[]
  steps: SessionStep[]
  currentStepIndex: number
  isStreaming: boolean
  setTopic: (topic: string) => void
  setMode: (mode: AppMode) => void
  setSessionId: (id: number) => void
  addMessage: (msg: Omit<Message, 'id'>) => void
  setSteps: (steps: string[]) => void
  advanceStep: () => void
  setStreaming: (v: boolean) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  topic: '',
  mode: 'tutor',
  sessionId: null,
  messages: [],
  steps: [],
  currentStepIndex: 0,
  isStreaming: false,
  setTopic: (topic) => set({ topic }),
  setMode: (mode) => set({ mode }),
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: crypto.randomUUID() }],
    })),
  setSteps: (labels) =>
    set({ steps: labels.map((label) => ({ label, completed: false })), currentStepIndex: 0 }),
  advanceStep: () =>
    set((s) => {
      const steps = s.steps.map((step, i) => i === s.currentStepIndex ? { ...step, completed: true } : step)
      return { steps, currentStepIndex: Math.min(s.currentStepIndex + 1, steps.length - 1) }
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  reset: () => set({ messages: [], steps: [], currentStepIndex: 0, sessionId: null, isStreaming: false }),
}))
```

- [ ] **Step 2: Implement audio store**

Create `store/audio.ts`:

```typescript
import { create } from 'zustand'
import type { Mood } from '@/lib/music'

interface Track {
  id: number
  name: string
  artist: string
  url: string
}

interface AudioState {
  mood: Mood
  track: Track | null
  isPlaying: boolean
  volume: number
  initialized: boolean
  setMood: (mood: Mood) => void
  setTrack: (track: Track) => void
  setPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setInitialized: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  mood: 'chill',
  track: null,
  isPlaying: false,
  volume: 0.5,
  initialized: false,
  setMood: (mood) => set({ mood }),
  setTrack: (track) => set({ track }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setInitialized: () => set({ initialized: true }),
}))
```

- [ ] **Step 3: Commit**

```bash
git add store/
git commit -m "feat: add Zustand session and audio stores"
```

---

## Task 11: Music Player Component

**Files:**
- Create: `components/MusicPlayer.tsx`

- [ ] **Step 1: Implement MusicPlayer.tsx**

Create `components/MusicPlayer.tsx`:

```tsx
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { useAudioStore } from '@/store/audio'
import type { Mood } from '@/lib/music'

async function fetchTrackForMood(mood: Mood): Promise<{ id: number; name: string; artist: string; url: string } | null> {
  const playlistRes = await fetch(`/api/music/playlist?mood=${mood}`)
  const { tracks } = await playlistRes.json() as { tracks: Array<{ id: number; name: string; ar: Array<{ name: string }> }> }
  if (!tracks?.length) return null
  const track = tracks[Math.floor(Math.random() * tracks.length)]
  const urlRes = await fetch(`/api/music/url?id=${track.id}`)
  const { url } = await urlRes.json() as { url: string | null }
  if (!url) return null
  return { id: track.id, name: track.name, artist: track.ar[0]?.name ?? 'Unknown', url }
}

export function MusicPlayer() {
  const { mood, track, isPlaying, volume, initialized, setTrack, setPlaying, setVolume, setInitialized } = useAudioStore()
  const howlRef = useRef<Howl | null>(null)

  const loadAndPlay = useCallback(async (m: Mood) => {
    const newTrack = await fetchTrackForMood(m)
    if (!newTrack) return
    howlRef.current?.fade(volume, 0, 500)
    setTimeout(() => {
      howlRef.current?.unload()
      const howl = new Howl({ src: [newTrack.url], html5: true, volume: 0 })
      howl.once('play', () => howl.fade(0, volume, 2000))
      howl.play()
      howlRef.current = howl
      setTrack(newTrack)
      setPlaying(true)
    }, 600)
  }, [volume, setTrack, setPlaying])

  useEffect(() => {
    if (initialized) loadAndPlay(mood)
  }, [mood, initialized, loadAndPlay])

  useEffect(() => {
    howlRef.current?.volume(volume)
  }, [volume])

  const handleInit = () => {
    setInitialized()
    loadAndPlay(mood)
  }

  const togglePlay = () => {
    if (!howlRef.current) return
    if (isPlaying) { howlRef.current.pause(); setPlaying(false) }
    else { howlRef.current.play(); setPlaying(true) }
  }

  if (!initialized) {
    return (
      <button
        onClick={handleInit}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
      >
        🎵 Start Music
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-sm text-white">
      <button onClick={togglePlay} className="text-lg">
        {isPlaying ? '⏸' : '▶️'}
      </button>
      <div className="truncate max-w-[160px]">
        {track ? `${track.name} — ${track.artist}` : 'Loading...'}
      </div>
      <input
        type="range" min="0" max="1" step="0.05"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="w-16 accent-indigo-400"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MusicPlayer.tsx
git commit -m "feat: add Howler.js MusicPlayer component with mood-based auto-load"
```

---

## Task 12: Core UI Components

**Files:**
- Create: `components/ContentChunk.tsx`, `components/ProgressBar.tsx`, `components/ModeToggle.tsx`, `components/QuizCard.tsx`, `components/FocusMode.tsx`

- [ ] **Step 1: ContentChunk.tsx**

Create `components/ContentChunk.tsx`:

```tsx
'use client'
import { useEffect, useRef } from 'react'

interface Props {
  content: string
  isStreaming?: boolean
  onComplete?: () => void
}

export function ContentChunk({ content, isStreaming, onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming && content && onComplete) onComplete()
  }, [isStreaming, content, onComplete])

  return (
    <div ref={ref} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl w-full animate-fade-in">
      <p className="text-gray-800 dark:text-gray-100 text-base leading-relaxed whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse rounded-sm" />}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: ProgressBar.tsx**

Create `components/ProgressBar.tsx`:

```tsx
'use client'
import { useSessionStore } from '@/store/session'

export function ProgressBar() {
  const { steps, currentStepIndex, topic } = useSessionStore()

  if (!steps.length) return null

  const completedCount = steps.filter(s => s.completed).length
  const percent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium truncate">{topic}</span>
        <span>Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {steps.map((step, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              step.completed ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' :
              i === currentStepIndex ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' :
              'text-gray-400 dark:text-gray-600'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ModeToggle.tsx**

Create `components/ModeToggle.tsx`:

```tsx
'use client'
import { useSessionStore, type AppMode } from '@/store/session'

export function ModeToggle() {
  const { mode, setMode } = useSessionStore()

  const toggle = (m: AppMode) => setMode(m)

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-sm">
      {(['tutor', 'agent'] as AppMode[]).map((m) => (
        <button
          key={m}
          onClick={() => toggle(m)}
          className={`px-4 py-1.5 rounded-full font-medium transition-colors capitalize ${
            mode === m
              ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          {m === 'tutor' ? '💬 Tutor' : '🤖 Agent'}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: QuizCard.tsx**

Create `components/QuizCard.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface Props {
  question: string
  answer: string
  onResult: (correct: boolean) => void
}

export function QuizCard({ question, answer, onResult }: Props) {
  const [userAnswer, setUserAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  const reveal = () => setRevealed(true)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl w-full space-y-4">
      <p className="font-medium text-gray-800 dark:text-gray-100">{question}</p>
      <textarea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={revealed}
        placeholder="Your answer..."
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {!revealed ? (
        <button onClick={reveal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          Reveal Answer
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-300"><strong>Answer:</strong> {answer}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onResult(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
              ✓ Got it
            </button>
            <button onClick={() => onResult(false)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors">
              ✗ Missed
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: FocusMode.tsx**

Create `components/FocusMode.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

export function FocusMode({ children }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <div className={focused ? 'fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center p-6' : 'contents'}>
      <button
        onClick={() => setFocused(f => !f)}
        className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        {focused ? '↙ Exit Focus' : '⛶ Focus Mode'}
      </button>
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Add fade-in animation to tailwind config**

In `tailwind.config.ts`, extend `theme.extend`:

```typescript
extend: {
  keyframes: {
    'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
  },
  animation: {
    'fade-in': 'fade-in 0.3s ease-out',
  },
},
```

- [ ] **Step 7: Commit**

```bash
git add components/ tailwind.config.ts
git commit -m "feat: add ContentChunk, ProgressBar, ModeToggle, QuizCard, FocusMode components"
```

---

## Task 13: Session Page

**Files:**
- Create: `app/page.tsx` (home — topic entry), `app/session/page.tsx`

- [ ] **Step 1: Home page (topic entry)**

Replace `app/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { ModeToggle } from '@/components/ModeToggle'
import { MusicPlayer } from '@/components/MusicPlayer'

export default function HomePage() {
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(20)
  const { mode, setTopic: storeTopic, setMode } = useSessionStore()
  const router = useRouter()

  const start = async () => {
    if (!topic.trim()) return
    storeTopic(topic.trim())
    const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, mode }) })
    const { sessionId } = await res.json() as { sessionId: number }
    useSessionStore.getState().setSessionId(sessionId)
    router.push(`/session?duration=${duration}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">Guided Learning</h1>
        <p className="text-gray-400 text-sm">AI-powered sessions with music therapy</p>
      </div>
      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
          placeholder="What do you want to learn today?"
          className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 outline-none focus:ring-2 focus:ring-indigo-400 text-base"
          autoFocus
        />
        <div className="flex items-center justify-between gap-4">
          <ModeToggle />
          {mode === 'agent' && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Duration:</span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                {[10, 15, 20, 30, 45].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={start}
          disabled={!topic.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start Session →
        </button>
      </div>
      <MusicPlayer />
    </main>
  )
}
```

- [ ] **Step 2: Add /api/sessions route**

Create `app/api/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb, createSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { topic, mode } = await req.json() as { topic: string; mode: 'tutor' | 'agent' }
  const db = getDb()
  const sessionId = createSession(db, { topic, mode })
  return NextResponse.json({ sessionId })
}
```

- [ ] **Step 3: Session page**

Create `app/session/page.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session'
import { useAudioStore } from '@/store/audio'
import { ContentChunk } from '@/components/ContentChunk'
import { ProgressBar } from '@/components/ProgressBar'
import { MusicPlayer } from '@/components/MusicPlayer'
import { QuizCard } from '@/components/QuizCard'
import { FocusMode } from '@/components/FocusMode'
import type { Mood } from '@/lib/music'

interface QuizQuestion { question: string; answer: string }

export default function SessionPage() {
  const { topic, mode, sessionId, messages, addMessage, setSteps, advanceStep, setStreaming, isStreaming } = useSessionStore()
  const { setMood } = useAudioStore()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!topic) { router.replace('/'); return }
    if (mode === 'agent') startAgentSession()
    else startTutorSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function startTutorSession() {
    setSteps(['Introduction', 'Deep Dive', 'Quiz', 'Summary'])
    await streamChat([{ role: 'user', content: `Start teaching me about "${topic}". Begin with a brief introduction.` }])
  }

  async function startAgentSession() {
    if (!sessionId) return
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, sessionId, durationMins: 20 }),
    })
    await readSSEStream(res)
  }

  async function streamChat(msgs: Array<{ role: 'user' | 'assistant'; content: string }>) {
    setStreaming(true)
    setStreamingText('')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, messages: msgs }),
    })
    await readSSEStream(res)
    setStreaming(false)
  }

  async function readSSEStream(res: Response) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6)) as { type: string; text?: string; mood?: Mood }
          if (event.type === 'delta' && event.text) {
            accumulated += event.text
            setStreamingText(accumulated)
          }
          if (event.type === 'text' && event.text) {
            accumulated += event.text
            setStreamingText(accumulated)
          }
          if (event.type === 'music_mood' && event.mood) {
            setMood(event.mood)
          }
          if (event.type === 'done') {
            if (accumulated) {
              addMessage({ role: 'assistant', content: accumulated })
              setStreamingText('')
              accumulated = ''
              advanceStep()
            }
          }
        } catch {}
      }
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    addMessage({ role: 'user', content: text })

    if (text === '/quiz') {
      setSteps([...useSessionStore.getState().steps.map(s => s.label), 'Quiz'])
    }

    await streamChat([
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ])
  }

  return (
    <FocusMode>
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex flex-col items-center p-6 gap-4">
        <header className="w-full max-w-2xl flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <MusicPlayer />
        </header>

        <ProgressBar />

        <div className="w-full max-w-2xl flex flex-col gap-4 flex-1">
          {messages.map(msg => (
            msg.role === 'assistant'
              ? <ContentChunk key={msg.id} content={msg.content} />
              : <div key={msg.id} className="self-end bg-indigo-600 text-white px-4 py-2 rounded-2xl text-sm max-w-xs">{msg.content}</div>
          ))}
          {streamingText && <ContentChunk content={streamingText} isStreaming />}
          {quiz.length > 0 && quizIndex < quiz.length && (
            <QuizCard
              question={quiz[quizIndex].question}
              answer={quiz[quizIndex].answer}
              onResult={() => setQuizIndex(i => i + 1)}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {mode === 'tutor' && (
          <div className="w-full max-w-2xl flex gap-2 sticky bottom-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question or type /quiz..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 outline-none focus:ring-2 focus:ring-indigo-400 text-sm disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </main>
    </FocusMode>
  )
}
```

- [ ] **Step 4: Add root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guided Learning',
  description: 'AI-powered learning with music therapy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Test in browser**

```bash
npm run dev
```

Open http://localhost:3000. Enter a topic (e.g., "Python decorators"), select Tutor mode, click Start Session.

Expected:
- Home page renders with topic input, mode toggle, music player
- Session starts, progress bar appears, AI streams content in chunks
- User can type and send messages
- `/quiz` triggers quiz generation

- [ ] **Step 6: Commit**

```bash
git add app/ 
git commit -m "feat: add home page, session page, and /api/sessions route"
```

---

## Task 14: Dashboard Page

**Files:**
- Create: `app/dashboard/page.tsx`, `app/api/dashboard/route.ts`

- [ ] **Step 1: Create dashboard API route**

Create `app/api/dashboard/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getDb, getAllTopicsWithProgress, getRecentSessions } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const topics = getAllTopicsWithProgress(db)
  const sessions = getRecentSessions(db, 10)
  return NextResponse.json({ topics, sessions })
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/dashboard/page.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Topic { id: number; name: string; averageScore: number; sessionCount: number }
interface Session { id: number; topic: string; mode: string; started_at: number; duration_mins: number | null }

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(({ topics, sessions }) => {
      setTopics(topics)
      setSessions(sessions)
    })
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">← Start Learning</Link>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Topics</h2>
          {topics.length === 0 ? (
            <p className="text-gray-500 text-sm">No topics studied yet. Start a session!</p>
          ) : (
            <div className="grid gap-3">
              {topics.map(topic => (
                <div key={topic.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{topic.name}</span>
                    <span className="text-sm text-gray-400">{topic.sessionCount} session{topic.sessionCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${topic.averageScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-indigo-400 font-semibold w-10 text-right">{topic.averageScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions yet.</p>
          ) : (
            <div className="grid gap-2">
              {sessions.map(s => (
                <div key={s.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">{s.topic}</span>
                    <span className="ml-2 text-xs text-gray-500 capitalize">{s.mode}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {s.duration_mins ? `${Math.round(s.duration_mins)} min` : 'In progress'}
                    <br />
                    {new Date(s.started_at * 1000).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Add dashboard link to home page**

In `app/page.tsx`, add below the start button:

```tsx
import Link from 'next/link'
// ...inside the JSX, after the start button:
<Link href="/dashboard" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
  View progress dashboard →
</Link>
```

- [ ] **Step 4: Test dashboard in browser**

Navigate to http://localhost:3000/dashboard. Complete a session first so there's data.

Expected: Topics appear with progress bars, recent sessions listed with date and duration.

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: All tests pass

- [ ] **Step 6: Final commit**

```bash
git add app/dashboard/ app/api/dashboard/
git commit -m "feat: add progress dashboard with topic scores and session history"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Next.js App Router + TypeScript — Task 1
- ✅ Tailwind CSS — Task 1
- ✅ Howler.js audio player — Task 11
- ✅ Claude API streaming + tool_use — Tasks 6, 8, 9
- ✅ Zustand state — Task 10
- ✅ SQLite via better-sqlite3 — Task 3
- ✅ AnkiConnect integration — Tasks 5, 7
- ✅ NeteaseCloudMusicApi — Tasks 4, 11
- ✅ Tutor mode (streaming chat) — Tasks 8, 13
- ✅ Agent mode (tool_use loop) — Tasks 7, 9, 13
- ✅ All 7 agent tools — Task 7
- ✅ Prompt caching — Task 6
- ✅ Music mood mapping + config/music.json — Tasks 2, 4
- ✅ config/anki.json — Task 2
- ✅ 250-word content chunks — Task 12 (ContentChunk)
- ✅ Progress bar + step indicator — Task 12 (ProgressBar)
- ✅ Focus mode — Task 12 (FocusMode)
- ✅ Micro-rewards animation — Task 12 (fade-in, level fill)
- ✅ Music on by default (user gesture flow) — Task 11 (MusicPlayer init button)
- ✅ No dead ends (next step always shown) — Task 12 (ProgressBar labels)
- ✅ Progress dashboard — Task 14
- ✅ NetEase QR login — Task 4 (/api/music/login)
