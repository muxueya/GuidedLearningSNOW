# Guided Learning — Architecture Design Spec

**Date:** 2026-04-23  
**Status:** Approved

---

## Overview

Guided Learning is a personal, AI-powered learning tool that pairs adaptive content generation with mood-based music from NetEase Cloud Music. It is designed specifically for a single user with light ADHD, prioritising short content chunks, always-visible progress, and minimal cognitive overhead. It runs entirely on localhost — no cloud deployment, no user accounts.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Full-stack in one repo, single `npm run dev`, SSE streaming built-in |
| Styling | Tailwind CSS | Utility-first, minimal bundle |
| Audio | Howler.js (browser) | Plays stream URLs from NetEase; no synthesis needed |
| AI | Claude API via Anthropic SDK | Streaming chat + native `tool_use` for agent mode |
| State | Zustand | Lightweight client state for session, audio, and UI |
| Database | SQLite via `better-sqlite3` | Local file, no server needed, persists across restarts |
| Flashcards | AnkiConnect (localhost:8765) | Full SM-2 spaced repetition handled by Anki desktop |
| Music | NeteaseCloudMusicApi (Node.js) | Unofficial package, server-side, cookie auth via QR login |

---

## System Architecture

```
┌─────────────── BROWSER ─────────────────────────────────────┐
│                                                              │
│  UI Layer (React)        Audio Player      Client State      │
│  ─────────────────        ────────────      ────────────     │
│  Session View             Howler.js         Zustand          │
│  Content Chunks           Streams URL       Session state    │
│  Progress Bar             Play/pause/skip   Now playing      │
│  Mode Toggle              Volume fade       UI state         │
│  Quiz View                                                   │
│  Music Mini-Player                                           │
│                                                              │
└──────────────────────── HTTP / SSE ─────────────────────────┘
                               │
┌─────────────── NEXT.JS SERVER (localhost) ───────────────────┐
│                                                              │
│  AI Routes              Music Routes        Anki Route       │
│  ──────────             ────────────        ──────────       │
│  /api/chat              /api/music/         /api/anki        │
│    Tutor mode             playlist            Proxies to     │
│    Streaming SSE          url                 localhost:8765  │
│    Message history        search                             │
│  /api/agent                                                  │
│    Agent mode           Agent Tools                          │
│    tool_use loop        ───────────                          │
│    Drives curriculum    search_web                           │
│                         save_note                            │
│                         get_progress                         │
│                         generate_quiz                        │
│                         set_music_mood                       │
│                         mark_complete                        │
│                         create_flashcard                     │
│                                                              │
└──────────────── SQL / External APIs ────────────────────────┘
         │                   │                    │
    SQLite file         Claude API          NetEase API
    sessions            Anthropic SDK       NeteaseCloudMusicApi
    topics              Prompt caching      Cookie auth (QR)
    progress            Streaming + tools
    notes
    quiz_results
```

---

## AI Modes

The user can switch modes at any time via a toggle in the UI.

### Tutor Mode
- Standard multi-turn conversation with a growing message history
- System prompt is cached (Anthropic prompt caching) — the tutor persona and topic context are set once and reused across all turns
- Responses streamed via SSE to the frontend
- Music mood is set by a rule: lo-fi for Q&A, focus for reading
- User types `/quiz` to trigger a quiz at any point

### Agent Mode
- Claude runs an agentic loop using `tool_use` — no external framework
- On session start, the agent calls `get_progress` to identify knowledge gaps, then plans a curriculum
- The agent controls music via `set_music_mood`, delivers content in chunks, calls `generate_quiz` between subtopics, and pushes flashcards to Anki via `create_flashcard`
- The agentic loop continues until the session plan is complete or the user ends the session

### No Agent Framework Required
Claude's native `tool_use` API is sufficient for both modes. LangChain, LangGraph, Mastra, and similar frameworks are not used.

---

## Agent Tools

| Tool | Description | Execution |
|---|---|---|
| `search_web` | Fetch current content via Brave Search API | Server-side HTTP |
| `save_note` | Persist a learning note to SQLite | SQLite write |
| `get_progress` | Retrieve topic history and scores | SQLite read |
| `generate_quiz` | Generate 3–5 quiz questions on a subtopic | Returns JSON to Claude |
| `set_music_mood` | Signal the frontend to switch music mood | SSE event to browser |
| `mark_complete` | Log subtopic completion and score | SQLite write |
| `create_flashcard` | Push a card to Anki via AnkiConnect | HTTP POST to localhost:8765 |

---

## Music Integration

NetEase Cloud Music is the audio source. The `NeteaseCloudMusicApi` Node.js package runs server-side and requires a one-time QR login that persists via cookie.

**Mood mapping** (stored in `config/music.json`, not hardcoded):

| Learning Mode | Mood | NetEase Keywords |
|---|---|---|
| Deep focus / Agent mode | Instrumental, minimal | 专注 · 纯音乐 · study |
| Tutor chat / Q&A | Lo-fi, chill | lofi · 放松 · 轻音乐 |
| Quiz / recall | Upbeat, light | 欢快 · 轻快 · positive |
| Break / rest | Ambient, calm | 冥想 · 自然声音 · ambient |

The `set_music_mood` agent tool sends an SSE event to the browser; Howler.js loads and plays the new track URL with a 2-second volume fade transition.

Audio context is initialised on the first user gesture (browser requirement) — the UI shows a "Click to start" overlay on first load.

---

## Data Model (SQLite)

```sql
sessions     (id, topic, mode, started_at, ended_at, duration_mins)
topics       (id, name, parent_id)
progress     (id, session_id, topic_id, score 0–100, completed_at)
notes        (id, session_id, content, created_at)
quiz_results (id, session_id, question, answer, correct, created_at)
```

Level/progress indication is derived by averaging scores per topic across all sessions. Spaced repetition scheduling is delegated entirely to Anki — the SQLite schema does not need to model it.

---

## Session Flows

### Tutor Mode Flow
1. User enters topic → music starts (lo-fi) → AI streams intro chunk
2. User reads chunk → asks question or types `/next`
3. AI responds in a new chunk (max 250 words)
4. Repeat until user types `/quiz`
5. Quiz generated, scored, and saved → progress bar and level updated

### Agent Mode Flow
1. User enters topic + duration → agent calls `get_progress`
2. Agent calls `set_music_mood` (focus) → plans curriculum
3. Agent calls `search_web` for fresh content
4. Agent delivers each subtopic as a chunk → progress bar advances
5. After each subtopic: agent calls `generate_quiz` and `create_flashcard`
6. At end: agent calls `mark_complete` + `save_note` → session logged

---

## ADHD-Friendly UX Rules

- **Content chunks**: Max 250 words per card. One idea per card. Never a wall of text.
- **Always-visible progress**: Progress bar + "Step N of M" label visible throughout every session.
- **Focus mode**: One-click toggle that hides all UI chrome except content and progress bar.
- **No dead ends**: Always show what comes next ("Next: Quiz" or "Next: Subtopic 2") — never blank state.
- **Micro-rewards**: Subtle animation and sound cue on completing each chunk and quiz. Level bar fills visibly.
- **Music on by default**: Music starts automatically at session begin after the first user gesture, with a 2-second fade-in.

---

## Prompt Caching Strategy

The Claude API system prompt — which defines the tutor persona, topic context, and user learning level — is cached using Anthropic prompt caching. This system prompt is identical across all turns in a session, so it qualifies for caching and reduces both latency and cost on every turn after the first.

---

## File Structure (intended)

```
/app
  /api
    /chat/route.ts       — tutor mode SSE
    /agent/route.ts      — agent mode tool_use loop
    /music/              — NetEase proxy routes
    /anki/route.ts       — AnkiConnect proxy
  /session/page.tsx      — main learning session UI
  /dashboard/page.tsx    — progress dashboard
  /layout.tsx
/lib
  /claude.ts             — Anthropic SDK client + streaming helpers
  /anki.ts               — AnkiConnect client
  /music.ts              — NeteaseCloudMusicApi wrapper
  /db.ts                 — SQLite client (better-sqlite3)
  /tools/                — one file per agent tool
/store
  /session.ts            — Zustand session store
  /audio.ts              — Zustand audio store
/config
  /music.json            — mood → NetEase keyword mapping
  /anki.json             — deck name, card model name
/docs/superpowers/specs/
```

---

## Out of Scope (v1)

- Cloud sync or multi-device support
- User accounts or authentication
- Custom Anki deck configuration UI (deck name is hardcoded in config)
- Mobile / responsive design
- Offline mode
