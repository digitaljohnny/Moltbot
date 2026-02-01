# Diagnostic: Buddy Not Responding to proposal:ingest

## What's Working ✅

1. **Handler code**: Fixed and working
2. **Proposal exists**: `TC-20260201-001` is in database
3. **Handler test**: Returns correct instructions when called directly
4. **Environment**: Token and URL are set correctly

## The Problem

Buddy isn't intercepting `proposal:ingest:TC-20260201-001` messages.

**Earlier success**: `proposal:view_json:TC-20260201-001` worked and returned JSON file, so routing WAS working.

## Possible Causes

1. **Buddy's routing only handles `view_json`**: Maybe Buddy only implemented routing for view_json, not ingest/skip
2. **Routing code not persistent**: Buddy might have implemented it once but it's not in persistent instructions
3. **Error being swallowed**: Handler might be failing silently

## What Buddy Needs to Do

Buddy must intercept **ALL** `proposal:*` messages, not just `proposal:view_json:*`.

The routing code in `SKILL.md` says to check for `proposal:` prefix, which should catch all actions:
- `proposal:ingest:*`
- `proposal:view_json:*`
- `proposal:skip:*`

## Test: Check if Buddy Has Routing

Send these messages and see which ones Buddy responds to:

1. `proposal:view_json:TC-20260201-001` - Should return JSON (this worked before)
2. `proposal:ingest:TC-20260201-001` - Should ingest and send receipt
3. `proposal:skip:TC-20260201-001` - Should mark skipped

If only #1 works, Buddy's routing is incomplete.

## Solution

Buddy needs to follow the instructions in `SKILL.md` section "Handling Proposal Callbacks (CRITICAL - EXECUTE IMMEDIATELY)" which handles ALL `proposal:*` messages, not just specific actions.

The code pattern should be:
```python
if message.get("text", "").startswith("proposal:"):
    # Handle ALL proposal: messages (ingest, view_json, skip)
    # Not just view_json
```

## Quick Fix: Reset Proposal Status

If you want to test ingest again, reset the proposal:

```bash
docker exec moltbot-setup python3 -c "
import sqlite3
db = '/home/node/clawd/data/course_proposals.db'
con = sqlite3.connect(db)
con.execute('UPDATE proposals SET status = \"pending\" WHERE proposal_id = \"TC-20260201-001\"')
con.commit()
con.close()
print('✅ Proposal reset to pending')
"
```

Then try `proposal:ingest:TC-20260201-001` again.
