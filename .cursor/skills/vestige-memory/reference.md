# Vestige (ClawHub: Belkouche/vestige) — reference

This file preserves the practical details and command snippets from the ClawHub `Vestige` page.

Source: `https://www.clawhub.ai/Belkouche/vestige`

## Summary

“Cognitive memory system based on 130 years of memory research. FSRS-6 spaced repetition, spreading activation, synaptic tagging—all running 100% local.”

## Binary location

- `~/bin/vestige-mcp`
- `~/bin/vestige`
- `~/bin/vestige-restore`

## Quick commands (JSON-RPC over stdin)

### Search memory

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"user preferences"}}}' | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text // .error.message'
```

### Save memory (smart ingest)

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"smart_ingest","arguments":{"content":"User prefers Swiss Modern design style for presentations","tags":["preference","design"]}}}' | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text // .error.message'
```

### Simple ingest

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ingest","arguments":{"content":"TKPay Offline project: POC 2 months, MVP 2 months, budget 250K DH","tags":["project","tkpay"]}}}' | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text // .error.message'
```

### Check stats

```bash
~/bin/vestige stats
```

### Health check

```bash
~/bin/vestige health
```

## MCP tools available (as listed)

- `search`: Unified search (keyword + semantic + hybrid)
- `smart_ingest`: Intelligent ingestion with duplicate detection
- `ingest`: Simple memory storage
- `memory`: Get, delete, or check memory state
- `codebase`: Remember patterns and architectural decisions
- `intention`: Set reminders and future triggers
- `promote_memory`: Mark memory as helpful (strengthens)
- `demote_memory`: Mark memory as wrong (weakens)

## Trigger words (as listed)

- “Remember this” → `smart_ingest` immediately
- “Don’t forget” → `smart_ingest` with high priority
- “I always...” / “I never...” → save as preference
- “I prefer...” / “I like...” → save as preference
- “This is important” → `smart_ingest` + `promote_memory`
- “Remind me...” → create `intention`

## Session start routine (as listed)

At the start of conversations, search for relevant context:

```bash
# Search user preferences
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"user preferences instructions"}}}' | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text'

# Search project context
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"current project context"}}}' | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text'
```

## Helper script (as listed)

Create `~/bin/vmem`:

```bash
#!/bin/bash
# Vestige Memory Helper
ACTION=$1
shift

case $ACTION in
  search)
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"search\",\"arguments\":{\"query\":\"$*\"}}}" | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text // .error.message'
    ;;
  save)
    echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"smart_ingest\",\"arguments\":{\"content\":\"$*\"}}}" | ~/bin/vestige-mcp 2>/dev/null | jq -r '.result.content[0].text // .error.message'
    ;;
  stats)
    ~/bin/vestige stats
    ;;
  *)
    echo "Usage: vmem [search|save|stats] [content]"
    ;;
esac
```

## Data location (as listed)

- **macOS**: `~/Library/Application Support/com.vestige.core/`
- **Linux**: `~/.local/share/vestige/`
- **Embedding cache**: `~/Library/Caches/com.vestige.core/fastembed/`

## Integration notes (as listed)

Vestige complements an existing `memory/` folder system:

- `memory/*.md` = human-readable daily logs
- `MEMORY.md` = curated long-term notes
- Vestige = semantic search + automatic decay + spaced repetition

Use Vestige for:

- Things you want to recall semantically (not just keyword search)
- Preferences that should persist indefinitely
- Solutions worth remembering (with automatic decay if unused)

