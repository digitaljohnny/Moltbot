# Live Test: Proposal Callback Routing

## Prerequisites

✅ Files copied to `/home/node/clawd/skills_for_moltbot/course-proposal-manager/`  
✅ Database path set to `/home/node/clawd/data/course_proposals.db`  
✅ Agent routing code added (see `INTEGRATION_SNIPPET.py`)

## Test Steps

### Step 1: Create a Test Proposal

Run golf-course-research for any course to create a proposal:

**Example:**
```
Research Royal Scot Golf Course in Lansing, MI
```

This will:
1. Complete the research
2. Create a proposal via `create_proposal()`
3. Send a proposal card with inline buttons
4. Store the proposal in the database

**Note the proposal ID** from the proposal card message (e.g., `TO-20260201-001`).

### Step 2: Test Callback Routing

Send this as a **plain text message** (not clicking a button):

```
proposal:view_json:<YOUR_PROPOSAL_ID>
```

Replace `<YOUR_PROPOSAL_ID>` with the actual ID from Step 1.

### Expected Results

#### ✅ If Routing Works Correctly:

Buddy should:
- **NOT** treat it as normal conversation
- **NOT** repeat or chat about the text
- **DO** respond with:
  - A JSON file attachment (the course data), OR
  - An error message like "Proposal not found / expired / unauthorized"

#### ❌ If Routing NOT Working:

Buddy will:
- Treat it as a normal message
- Respond conversationally (e.g., "I see you mentioned 'proposal:view_json:...'")
- This means the routing hook isn't installed

## Troubleshooting

### "Proposal not found"

- Verify proposal exists: Check the proposal card was created
- Check proposal ID matches exactly (case-sensitive)
- Verify database exists: `/home/node/clawd/data/course_proposals.db`

### "Module not found" / Import errors

- Check files exist: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py`
- Verify Python path in your agent code matches `/home/node/clawd/...`
- Check agent's Python environment has access to the files

### Routing not working (Buddy chats about it)

- Verify `route_proposal_callbacks()` is called **BEFORE** LLM processing
- Check the `if text.startswith("proposal:")` condition is working
- Ensure function returns `{"handled": True}` to stop normal processing
- Check for errors in agent logs

### "Permission denied" on database

- Fix ownership: `docker exec moltbot-setup chown -R node:node /home/node/clawd/data`
- Verify data directory exists: `docker exec moltbot-setup ls -ld /home/node/clawd/data`

## Next Test: Button Click

After routing works with manual message:

1. Create a new proposal (or use existing)
2. Click the "Ingest" button on the proposal card
3. Expected:
   - Original card updates with status
   - Buttons cleared
   - Receipt message sent
   - Course ingested into database

## Quick Verification Commands

```bash
# Check files exist
docker exec moltbot-setup ls -la /home/node/clawd/skills_for_moltbot/course-proposal-manager/ | grep callback_handler

# Check database exists (after creating a proposal)
docker exec moltbot-setup ls -lh /home/node/clawd/data/course_proposals.db

# Test Python import (may fail if requests not available, but that's OK)
docker exec moltbot-setup python3 -c "
import sys
sys.path.insert(0, '/home/node/clawd/skills_for_moltbot/course-proposal-manager')
from callback_handler import handle_telegram_callback_message
print('Import successful')
"
```
