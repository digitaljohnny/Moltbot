# Test Now: Proposal Callback Routing

## ✅ Test Proposal Created

**Proposal ID:** `TC-20260201-001`

This proposal is ready for testing. The database contains a test proposal that you can use to verify the routing works.

## Quick Test

### Step 1: Send Test Message

In Telegram, send this **exact message** (as plain text, not clicking a button):

```
proposal:view_json:TC-20260201-001
```

### Step 2: Expected Result

#### ✅ If Routing Works Correctly:

Buddy should:
- **NOT** treat it as normal conversation
- **NOT** repeat or chat about the text
- **DO** respond with:
  - A JSON file attachment (the test course data), OR
  - An error message like "Proposal not found / expired / unauthorized"

#### ❌ If Routing NOT Working:

Buddy will:
- Treat it as a normal message
- Respond conversationally (e.g., "I see you mentioned 'proposal:view_json:...'")
- This means Buddy hasn't implemented the routing yet

## What Buddy Needs to Do

When Buddy receives `proposal:view_json:TC-20260201-001`, it should:

1. **Recognize** the `proposal:` prefix
2. **Import** the handler: `from callback_handler import handle_telegram_callback_message`
3. **Call** the handler with message details
4. **Execute** the returned instruction (send JSON file)
5. **Stop** - don't send to LLM

See `SKILL.md` for complete step-by-step code.

## Verify Proposal Exists

```bash
docker exec moltbot-setup python3 -c "
import sqlite3
db = '/home/node/clawd/data/course_proposals.db'
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute('SELECT proposal_id, status, course_name FROM proposals WHERE proposal_id = ?', ('TC-20260201-001',))
row = cur.fetchone()
if row:
    print(f'✅ Proposal found: {row[0]} | {row[1]} | {row[2]}')
else:
    print('❌ Proposal not found')
con.close()
"
```

## Create More Test Proposals

If you need more test proposals:

```bash
docker exec moltbot-setup python3 /home/node/clawd/skills_for_moltbot/course-proposal-manager/create_test_proposal.py
```

Or run golf-course-research for a real course to create a real proposal.

## Troubleshooting

**"Proposal not found"**
- Verify proposal exists with the command above
- Check proposal ID matches exactly (case-sensitive)

**"Proposal handler not found"**
- Check files exist: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/`
- Verify Buddy's Python path includes this directory

**Routing not working**
- Buddy needs to check `proposal:` prefix BEFORE LLM processing
- See `SKILL.md` section "Handling Proposal Callbacks (CRITICAL - EXECUTE IMMEDIATELY)"

## Status

✅ **Test proposal ready:** `TC-20260201-001`  
✅ **Files in container**  
✅ **Zero external dependencies**  
✅ **Instructions in SKILL.md**  
⏳ **Waiting for Buddy to implement routing**
