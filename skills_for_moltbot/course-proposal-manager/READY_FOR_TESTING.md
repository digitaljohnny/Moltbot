# Ready for Testing ✅

## What's Complete

### ✅ Files in Container
- **Handler**: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py`
- **Manager**: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/proposal_manager.py`
- **SKILL.md**: Updated with step-by-step instructions for Buddy
- **Database**: `/home/node/clawd/data/course_proposals.db` (created on first proposal)

### ✅ Zero External Dependencies
- Switched from `requests` to `urllib.request` (standard library)
- All imports verified working in container
- No pip installs needed

### ✅ Agent Instructions Updated
- SKILL.md contains complete step-by-step instructions
- Buddy knows to intercept `proposal:*` messages
- Instructions include exact code for executing Telegram actions

## How to Test

### Step 1: Create a Test Proposal

Run golf-course-research for any course:

```
Research Royal Scot Golf Course in Lansing, MI
```

This will:
1. Complete research
2. Create a proposal via `create_proposal()`
3. Send proposal card with inline buttons
4. Store proposal in database

**Note the proposal ID** from the proposal card (e.g., `TO-20260201-001`).

### Step 2: Test Callback Routing

Send this as a **plain text message** in Telegram:

```
proposal:view_json:<YOUR_PROPOSAL_ID>
```

Replace `<YOUR_PROPOSAL_ID>` with the actual ID from Step 1.

### Expected Results

#### ✅ If Routing Works:

Buddy should:
- **NOT** treat it as normal conversation
- **NOT** repeat or chat about the text
- **DO** respond with:
  - A JSON file attachment (the course data), OR
  - An error message like "Proposal not found / expired / unauthorized"

#### ❌ If Routing NOT Working:

Buddy will:
- Treat it as a normal message
- Respond conversationally
- This means Buddy hasn't implemented the routing yet

## What Buddy Needs to Do

When Buddy receives a message starting with `proposal:`, it should:

1. **Check prefix**: `if message.get("text", "").startswith("proposal:")`
2. **Import handler**: `from callback_handler import handle_telegram_callback_message`
3. **Call handler**: Pass message text, chat_id, from_user_id, message_id
4. **Execute instructions**: Use Moltbot's `message()` tool to send/edit files
5. **Stop**: Don't send to LLM

See `SKILL.md` for complete step-by-step code.

## Verification Commands

```bash
# Check files exist
docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/ | grep -E "(callback_handler|proposal_manager|SKILL)"

# Test imports (should work without requests)
docker exec moltbot-setup python3 -c "
import sys
sys.path.insert(0, '/home/node/clawd/skills_for_moltbot/course-proposal-manager')
from callback_handler import handle_telegram_callback_message
from proposal_manager import create_proposal
print('✓ All imports successful')
"

# Check database (after creating a proposal)
docker exec moltbot-setup python3 -c "
import sqlite3
db = '/home/node/clawd/data/course_proposals.db'
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute('SELECT proposal_id, status, course_name FROM proposals ORDER BY created_at DESC LIMIT 5')
for r in cur.fetchall():
    print(r)
con.close()
"
```

## Next Steps

1. **Buddy implements routing** - Follows instructions in SKILL.md
2. **Create test proposal** - Run golf-course-research
3. **Test callback** - Send `proposal:view_json:<ID>`
4. **Verify result** - Should get JSON file or error (not conversation)

## Troubleshooting

**"Proposal handler not found"**
- Check files exist: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/`
- Verify Python path in Buddy's code

**"Module not found"**
- All modules use standard library (urllib, json, sqlite3)
- Should work without any pip installs

**Routing not working**
- Buddy needs to check `proposal:` prefix BEFORE LLM processing
- See SKILL.md for exact code pattern

**Database errors**
- Database created automatically on first proposal
- Check permissions: `docker exec moltbot-setup ls -ld /home/node/clawd/data`

## Status

✅ **Ready for Buddy to implement routing**
✅ **Zero external dependencies**
✅ **All files in container**
✅ **Instructions complete**
