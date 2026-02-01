# Telegram Proposal Flow Test Results

## Test Date: [Fill in date]

## Test Step 1: Create Proposal

**Action:** [Describe how you triggered the research]

**Result:**
- ✅ Proposal card appeared
- Proposal ID: `[e.g., RS-20260201-001]`
- Message ID: `[e.g., 12345]`
- Buttons visible: `[Ingest] [View JSON] [Skip]`

**Screenshot/Notes:**
```
[Paste proposal card text here]
```

---

## Test Step 2: First Ingest

**Action:** Clicked "Ingest" button

**Callback Message Text:**
```
proposal:ingest:[PROPOSAL_ID]
```

**Expected Results:**

### ✅ Original Card Updated:
- [ ] Card text updated to show "✅ **Ingested** at [time]"
- [ ] Buttons cleared/removed
- [ ] Course ID shown: `course_xxx`
- [ ] Snapshot ID shown: `snapshot_yyy`

### ✅ Receipt Message Sent:
- [ ] Separate message appeared
- [ ] Text: "✅ **Ingested** at [time]\nCourse ID: `course_xxx`\nSnapshot: `snapshot_yyy`"

**Actual Results:**
```
[Paste receipt message text here]
```

**Issues (if any):**
- [ ] Buttons didn't clear
- [ ] No receipt message
- [ ] Card didn't update
- [ ] Other: ________________

---

## Test Step 3: Second Ingest (Idempotency Test)

**Action:** Clicked "Ingest" button again

**Callback Message Text:**
```
proposal:ingest:[PROPOSAL_ID]
```

**Expected Results:**
- [ ] "Already ingested" message received
- [ ] No new snapshot created
- [ ] Same snapshotId as first ingest

**Actual Results:**
```
[Paste response message text here]
```

**Database Verification:**
```bash
# Run this command and paste result:
docker exec courses-db psql -U courses -d courses -c \
  "SELECT COUNT(*) FROM course_snapshots WHERE course_id = '[COURSE_ID]' AND payload_hash IS NOT NULL;"
```

**Result:** `[Should be 1]`

---

## Summary

### ✅ Working Correctly:
- [ ] Proposal creation
- [ ] First ingest (card update + receipt)
- [ ] Button clearing
- [ ] Second ingest (idempotent response)
- [ ] Database (only 1 snapshot)

### ❌ Issues Found:
1. ________________
2. ________________

### Notes:
```
[Any additional observations]
```

---

## Next Steps (if issues found):

1. **If buttons don't clear:**
   - Check if Telegram library supports `reply_markup` in `edit_message_text`
   - May need separate `edit_message_reply_markup` call
   - See `TELEGRAM_TEST_CHECKLIST.md` troubleshooting section

2. **If no receipt message:**
   - Verify integration handles `kind: "multiple"` instructions
   - Check that both instructions are executed

3. **If second ingest creates new snapshot:**
   - Verify proposal status check is working
   - Check database: `SELECT status FROM proposals WHERE proposal_id = '...'`
   - Should be `ingested`, not `pending`

4. **If callback not recognized:**
   - Verify message handler checks for `text.startswith("proposal:")`
   - Check that `handle_telegram_callback_message()` is being called

---

## Code Verification

**Integration Code Location:**
```
[Path to your Telegram message handler]
```

**Key Function:**
```python
# Should look something like this:
def handle_incoming_message(message):
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=str(message["chat"]["id"]),
            from_user_id=str(message.get("from", {}).get("id", "")),
            message_id=message.get("message_id")
        )
        
        if result["kind"] == "multiple":
            for instruction in result["instructions"]:
                execute_instruction(instruction)
        else:
            execute_instruction(result)
        
        return
```

**Status:** [ ] Verified [ ] Needs Update
