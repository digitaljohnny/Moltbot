---
name: vestige-memory
description: Uses Vestige (FSRS-6 spaced repetition memory system) for persistent recall across sessions. Use when the user asks to “remember this”, “don’t forget”, shares stable preferences (“I prefer…”, “I always…”), important fixes/solutions, architectural decisions, or reminders/future triggers. Prefer searching memory first, then saving via smart ingest with tags; strengthen/weakening memories based on correctness.
---

# Vestige Memory Skill

## What this skill is for

Vestige is a **local-first memory system** (FSRS-6 spaced repetition + semantic search) intended to make important context **persist across sessions**, while allowing unused memories to naturally fade.

Use it to:

- Keep long-lived **user preferences** (tech stack, style, constraints)
- Store **decisions** and **project patterns** worth reusing
- Remember **bug fixes** and solutions that would otherwise be rediscovered
- Set **reminders** / future triggers (“Remind me…”)

## Quick start workflow (default)

1. **Search first**
   - Look up relevant context before acting (preferences, prior decisions, prior solutions).
2. **Save only what’s worth recalling**
   - Prefer **smart ingest** with short, durable phrasing and helpful tags.
3. **Strengthen or correct over time**
   - If a memory was useful/correct → promote it.
   - If it was wrong/outdated → demote it (or delete/replace it).

## Trigger words → actions

- **“Remember this”** → save via smart ingest immediately (with tags)
- **“Don’t forget …”** → save via smart ingest (mark as high priority if supported)
- **“I always…” / “I never…” / “I prefer…” / “I like…”** → save as a preference
- **“This is important”** → smart ingest, then promote memory
- **“Remind me …”** → create an intention/reminder

## What to store (and what not to)

- **Do store**: stable preferences, decisions with rationale, reusable fixes, constraints, TODOs with triggers (“when X happens, do Y”), links/titles with a 1-line summary.
- **Do NOT store**: secrets (tokens/keys), passwords, personal data, large raw dumps (logs, entire files) without summarizing.

## Tooling expectations

If Vestige is available as an MCP server, use its tools:

- `search`: find relevant memories (keyword/semantic/hybrid)
- `smart_ingest`: ingest with dedupe + better defaults
- `ingest`: simple storage
- `intention`: reminders / future triggers
- `codebase`: patterns + architectural decisions
- `promote_memory` / `demote_memory`: adjust strength based on usefulness/correctness

For command-line usage examples and data locations, see `reference.md`.

## Source

- ClawHub listing: `https://www.clawhub.ai/Belkouche/vestige`
