# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Guided Learning** is a smart, AI-powered learning tool that integrates music therapy techniques to simplify learning, boost focus, improve memory retention, and enhance learning outcomes. The core hypothesis is that carefully selected background music (binaural beats, lo-fi, ambient, classical) paired with adaptive learning sessions improves cognitive performance.

## Tech Stack (Intended)

- **Frontend**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS
- **Audio Engine**: Tone.js or Howler.js for music therapy playback
- **AI/LLM**: Claude API (Anthropic SDK) for adaptive content generation, quiz creation, and personalized learning paths
- **State Management**: Zustand
- **Backend** (if needed): Node.js + Express or Next.js API routes
- **Database**: SQLite (local) or Supabase (cloud)

## Core Features

1. **Learning Sessions** — Structured study sessions with configurable duration, topic, and difficulty
2. **Music Therapy Engine** — Background audio selection based on task type (focus, memorization, creative thinking) with binaural beat frequencies, lo-fi, or ambient soundscapes
3. **Adaptive Content** — Claude API generates explanations, summaries, and quizzes tailored to the learner's level and progress
4. **Progress Tracking** — Session history, retention scores, and focus metrics
5. **Spaced Repetition** — Flashcard/quiz scheduling using SM-2 or a simplified interval algorithm

## Architecture Principles

- Music therapy state (current track, frequency, volume) should be managed independently from learning content state — they have different lifecycles
- The Claude API integration should support streaming responses for long-form content generation
- Audio context must be initialized on user gesture (browser requirement) — handle this carefully in the UI layer
- Learning session data should be persisted locally first; cloud sync is a later concern

## Development Commands

> Commands will be added here as the project is scaffolded (e.g., `npm run dev`, `npm test`, `npm run build`).

## Key Design Decisions

- **Music therapy frequency mapping**: Focus tasks → 40 Hz gamma binaural beats; memorization → 10 Hz alpha; relaxed reading → 6 Hz theta. Document any changes to this mapping.
- **Claude API usage**: Use prompt caching for system prompts that define the tutor persona and learning context — this recurs across all session turns and should be cached to reduce latency and cost.
- **Session flow**: User selects topic → AI generates a learning outline → music starts → content is delivered in chunks → quiz at the end → results logged.
