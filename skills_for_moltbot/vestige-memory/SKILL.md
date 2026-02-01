---
name: vestige-memory
description: Uses Vestige (FSRS-6 spaced repetition memory system) for persistent recall across sessions. Use when the user asks to "remember this", "don't forget", shares stable preferences ("I prefer…", "I always…"), important fixes/solutions, architectural decisions, or reminders/future triggers. Always search memory first before acting, then save via smart ingest with tags. Strengthen or weaken memories based on correctness.
---

# Vestige Memory Skill

Vestige is a **local-first memory system** (FSRS-6 spaced repetition + semantic search) that makes important context persist across sessions while allowing unused memories to naturally fade.

## When to use

- **User preferences**: "I prefer…", "I always…", "I never…", "I like…"
- **Explicit requests**: "Remember this", "Don't forget…", "This is important"
- **Reminders**: "Remind me…" (future triggers)
- **Project context**: Architectural decisions, bug fixes, reusable solutions
- **Before acting**: Search for relevant preferences/decisions before making changes

## Workflow

### 1. Check availability

First, check if Vestige MCP tools are available:
- Look for MCP tools: `search`, `smart_ingest`, `ingest`, `intention`, `codebase`
- If MCP tools unavailable, use CLI commands from `reference.md`

### 2. Search before acting

Before making decisions or changes, search for relevant context:

**Examples:**
- User asks to refactor code → search for "code style preferences" or "refactoring patterns"
- User mentions a project → search for "project context" or the project name
- User shares a preference → search first to avoid duplicates

**MCP tool:**
```
search(query: "user preferences about [topic]")
```

### 3. Save memories

Use `smart_ingest` (preferred) or `ingest` with:
- **Short, durable phrasing**: "User prefers TypeScript over JavaScript"
- **Helpful tags**: `["preference", "typescript"]`
- **Context when needed**: Include project name or domain

**Examples:**
- Input: "I prefer Swiss Modern design style"
- Save: `smart_ingest(content: "User prefers Swiss Modern design style for presentations", tags: ["preference", "design"])`

- Input: "Remember: always use async/await, never promises.then()"
- Save: `smart_ingest(content: "Always use async/await syntax, never promises.then()", tags: ["preference", "javascript", "async"])`

### 4. Strengthen or correct

- **Memory was useful/correct** → `promote_memory(memory_id)`
- **Memory was wrong/outdated** → `demote_memory(memory_id)` or delete/replace

## Trigger words → actions

| Trigger | Action |
|---------|--------|
| "Remember this" | `smart_ingest` immediately with tags |
| "Don't forget…" | `smart_ingest` with high priority tag |
| "I always…" / "I prefer…" / "I like…" | `smart_ingest` with tag `["preference"]` |
| "This is important" | `smart_ingest` then `promote_memory` |
| "Remind me…" | `intention` (create reminder/trigger) |

## What to store

**Do store:**
- Stable preferences (tech stack, style, constraints)
- Decisions with rationale
- Reusable fixes and solutions
- Project patterns and architectural decisions
- TODOs with triggers ("when X happens, do Y")
- Links/titles with 1-line summary

**Do NOT store:**
- Secrets, tokens, keys, passwords
- Personal data
- Large raw dumps (logs, entire files) without summarizing

## MCP tools

If Vestige MCP server is available, use these tools:

- `search`: Find relevant memories (keyword/semantic/hybrid)
- `smart_ingest`: Intelligent ingestion with duplicate detection
- `ingest`: Simple memory storage
- `intention`: Create reminders/future triggers
- `codebase`: Store patterns and architectural decisions
- `promote_memory` / `demote_memory`: Adjust memory strength

## Fallback: CLI usage

If MCP tools are unavailable, use CLI commands from `reference.md`:
- Search: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"..."}}}' | ~/bin/vestige-mcp`
- Save: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"smart_ingest","arguments":{"content":"...","tags":[...]}}}' | ~/bin/vestige-mcp`

## Additional resources

- Command-line examples and data locations: `reference.md`
- ClawHub listing: `https://www.clawhub.ai/Belkouche/vestige`
