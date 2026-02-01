# Telegram Proposal Flow Test Checklist

## Test Scenario: End-to-End Proposal → Ingest → Idempotent Retry

### Prerequisites
- ✅ Course ingest API is running and idempotency is working (verified via curl)
- ✅ Proposal manager skill is installed in Moltbot
- ✅ Golf course research skill is configured to create proposals
- ✅ Telegram bot is connected and receiving messages

---

## Test Step 1: Create Proposal

**Action:** Trigger golf course research for a new course (or re-run an existing one)

**Expected Result:**
- ✅ Proposal card appears in Telegram with:
  - Course name, city, state
  - Key facts (address, holes, access, tech, etc.)
  - Inline buttons: `[Ingest] [View JSON] [Skip]`
  - Proposal ID shown (e.g., "Proposal: RS-20260201-001")

**What to Check:**
- [ ] Message appears in Telegram
- [ ] Buttons are clickable
- [ ] Proposal ID is visible
- [ ] Note the `message_id` of this proposal card (you'll need it later)

---

## Test Step 2: First Ingest (Tap "Ingest" Button)

**Action:** Click the "Ingest" button on the proposal card

**Expected Callback:**
- Callback message text: `proposal:ingest:RS-20260201-001` (or similar)

**Expected Results:**

1. **Original Proposal Card Updates:**
   - ✅ Card text updates to show: "✅ **Ingested** at [time]\nCourse ID: `course_xxx`\nSnapshot: `snapshot_yyy`"
   - ✅ Buttons are cleared/removed (no longer clickable)

2. **Separate Receipt Message:**
   - ✅ New message appears with: "✅ **Ingested** at [time]\nCourse ID: `course_xxx`\nSnapshot: `snapshot_yyy`"

**What to Check:**
- [ ] Original card text updated
- [ ] Buttons cleared (try clicking - should not work)
- [ ] Receipt message sent separately
- [ ] Both messages show same `courseId` and `snapshotId`

**If Buttons Don't Clear:**
- Your Telegram library might need separate `edit_message_reply_markup` call
- See troubleshooting section below

---

## Test Step 3: Second Ingest (Tap "Ingest" Again)

**Action:** Click the "Ingest" button again (even though it should be cleared)

**Expected Behavior:**

**If buttons were cleared:**
- Button click should do nothing (no callback sent)

**If buttons still visible (bug):**
- Callback: `proposal:ingest:RS-20260201-001`
- Expected response: "✅ Already ingested\nCourse ID: `course_xxx`" (no new snapshot)

**What to Check:**
- [ ] No new snapshot created (verify in database)
- [ ] Receipt message shows "Already ingested" or similar
- [ ] Same `snapshotId` as first ingest (idempotent)

**Database Verification:**
```bash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT COUNT(*) FROM course_snapshots WHERE course_id = 'course_xxx' AND payload_hash IS NOT NULL;"
# Should return: 1 (only one snapshot)
```

---

## Troubleshooting

### Issue: Buttons Don't Clear

**Symptom:** After ingest, proposal card updates but buttons remain clickable

**Cause:** Telegram library doesn't support `reply_markup` in `edit_message_text`

**Fix:** Update your integration to use separate calls:

```python
# In execute_telegram_instruction() or similar
if instruction["kind"] == "edit_message":
    edit = instruction["edit"]
    
    # First, edit the text
    edit_message_text(
        chat_id=edit["chat_id"],
        message_id=edit["message_id"],
        text=edit["new_text"],
        parse_mode="Markdown"
    )
    
    # Then, clear buttons separately
    if "reply_markup" in edit:
        edit_message_reply_markup(
            chat_id=edit["chat_id"],
            message_id=edit["message_id"],
            reply_markup={"inline_keyboard": []}
        )
```

### Issue: No Receipt Message

**Symptom:** Card updates but no separate receipt message appears

**Cause:** Integration not executing multiple instructions

**Fix:** Ensure your handler processes `kind: "multiple"`:

```python
if result["kind"] == "multiple":
    for instruction in result["instructions"]:
        execute_instruction(instruction)
else:
    execute_instruction(result)
```

### Issue: "Already Ingested" Not Working

**Symptom:** Second ingest creates new snapshot instead of returning existing

**Cause:** Proposal status check or idempotency not working

**Check:**
1. Verify proposal status in database:
   ```bash
   docker exec moltbot-setup sqlite3 /root/clawd/data/course_proposals.db \
     "SELECT proposal_id, status, course_id, snapshot_id FROM proposals WHERE proposal_id = 'RS-20260201-001';"
   ```
2. Verify idempotency at API level (curl test should work)
3. Check callback handler safety checks are working

### Issue: Callback Not Recognized

**Symptom:** Clicking button sends message but nothing happens

**Cause:** Message handler not detecting `proposal:` prefix

**Fix:** Ensure your Telegram message handler checks for prefix:

```python
def handle_incoming_message(message):
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        # Handle proposal callback
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=str(message["chat"]["id"]),
            from_user_id=str(message.get("from", {}).get("id", "")),
            message_id=message.get("message_id")
        )
        # Execute instructions...
        return
    
    # Handle other messages...
```

---

## Expected Callback Flow

### First Ingest:
```
User clicks "Ingest" button
  ↓
Telegram sends: "proposal:ingest:RS-20260201-001"
  ↓
handle_telegram_callback_message() validates:
  ✅ Sender is authorized (8372254579)
  ✅ Proposal exists and is pending
  ✅ Proposal not expired
  ↓
handle_ingest_action() executes:
  ✅ Calls ingest_proposal()
  ✅ POSTs to course-ingest API
  ✅ API returns: {courseId, snapshotId, idempotent: false}
  ✅ Updates proposal status to "ingested"
  ↓
Returns multiple instructions:
  ✅ Edit original card (if message_id stored)
  ✅ Send receipt message
  ↓
Integration executes both instructions
```

### Second Ingest (if buttons still visible):
```
User clicks "Ingest" button again
  ↓
Telegram sends: "proposal:ingest:RS-20260201-001"
  ↓
handle_telegram_callback_message() validates:
  ✅ Sender authorized
  ✅ Proposal exists
  ❌ Proposal status = "ingested" (not pending)
  ↓
Returns error instruction:
  ✅ "✅ Already ingested\nCourse ID: `course_xxx`"
  ↓
No API call made (proposal already ingested)
```

---

## Verification Queries

### Check Proposal Status:
```bash
docker exec moltbot-setup sqlite3 /root/clawd/data/course_proposals.db \
  "SELECT proposal_id, status, course_id, snapshot_id, ingested_at FROM proposals ORDER BY created_at DESC LIMIT 5;"
```

### Check Snapshot Count:
```bash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT course_id, COUNT(*) as snapshot_count FROM course_snapshots WHERE payload_hash IS NOT NULL GROUP BY course_id ORDER BY snapshot_count DESC LIMIT 10;"
```

### Check Idempotency:
```bash
# Should show 1 snapshot per unique payload_hash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT course_id, COUNT(*) as total, COUNT(DISTINCT payload_hash) as unique_hashes FROM course_snapshots WHERE payload_hash IS NOT NULL GROUP BY course_id HAVING COUNT(*) != COUNT(DISTINCT payload_hash);"
# Should return 0 rows (all snapshots have unique hashes)
```

---

## Success Criteria

✅ Proposal card appears with buttons  
✅ First ingest: Card updates + buttons clear + receipt sent  
✅ Second ingest: "Already ingested" message, no new snapshot  
✅ Database shows only 1 snapshot for the course  
✅ Proposal status = "ingested" in SQLite  

If all criteria pass, the system is working correctly! 🎉
