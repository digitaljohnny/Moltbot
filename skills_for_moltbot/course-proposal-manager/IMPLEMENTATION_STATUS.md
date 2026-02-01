# Course Proposal Manager - Implementation Status

## ✅ Completed

### 1. Proposal Storage System
- ✅ SQLite database at `/root/clawd/data/course_proposals.db`
- ✅ Schema with proposals table (status, expiration, ingestion tracking)
- ✅ Helper functions: create, get, ingest, skip, list, cleanup

### 2. Proposal Manager Module
- ✅ `proposal_manager.py` with all core functions
- ✅ Auto-ingest mode support (`AUTO_INGEST` env var)
- ✅ Human-readable proposal ID generation (`RS-20260201-001`)
- ✅ Proposal message formatting
- ✅ Integration with course-ingest API

### 3. Golf Course Research Integration
- ✅ Updated `golf-course-research/SKILL.md` with post-research steps
- ✅ Instructions for importing proposal manager
- ✅ Auto-ingest vs confirm-then-ingest logic
- ✅ Telegram button format specification

### 4. Callback Handler
- ✅ `callback_handler.py` with flexible handling
- ✅ Supports both message-based and callback_query formats
- ✅ Handles ingest, view_json, skip actions
- ✅ Message editing and file sending
- ✅ Error handling and edge cases

### 5. Documentation
- ✅ `SKILL.md` - Skill definition
- ✅ `README.md` - Quick reference
- ✅ `INTEGRATION.md` - Integration guide
- ✅ `TELEGRAM_INTEGRATION.md` - Callback handling patterns

## ⏳ Pending (Requires Testing)

### 1. Determine Callback Format
**Action Required:** Test what format Telegram callbacks use in your system.

**Test:**
```python
# Send a test message with buttons
buttons = [[{"text": "Test", "callback_data": "test:123"}]]
send_message("Test", reply_markup={"inline_keyboard": buttons})
```

**Check what arrives:**
- **Option A**: New message with text `"test:123"` → Use `handle_telegram_callback_message()`
- **Option B**: Callback query object → Use `handle_telegram_callback_query()`

### 2. Wire Callback Handler
Once you know the format, integrate the appropriate handler:

**If message-based:**
```python
def on_message(message):
    if message["text"].startswith("proposal:"):
        handle_telegram_callback_message(...)
```

**If callback_query:**
```python
def on_callback_query(callback_query):
    if callback_query["data"].startswith("proposal:"):
        handle_telegram_callback_query(...)
```

### 3. Test End-to-End
1. Research a course → Should create proposal
2. Receive proposal message with buttons
3. Click "Ingest" → Should ingest and update message
4. Click "View JSON" → Should send JSON file
5. Click "Skip" → Should mark skipped and update message

## File Locations

All files are in `/root/clawd/skills/course-proposal-manager/`:

- `proposal_manager.py` - Core proposal management
- `callback_handler.py` - Telegram callback handling
- `SKILL.md` - Skill documentation
- `README.md` - Quick reference
- `INTEGRATION.md` - Integration guide
- `TELEGRAM_INTEGRATION.md` - Callback patterns

## Environment Variables Needed

Add to Moltbot environment:

```bash
COURSE_INGEST_URL=http://host.docker.internal:8088
COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
AUTO_INGEST=false  # Set to "true" to skip proposals
```

## Next Steps

1. **Test callback format** - Determine message vs callback_query
2. **Integrate handler** - Wire up the appropriate handler function
3. **Test workflow** - Research → Proposal → Ingest
4. **Deploy** - Move to production when confident

## Callback Data Format

All callbacks use: `proposal:{action}:{proposal_id}`

- `proposal:ingest:RS-20260201-001`
- `proposal:view_json:RS-20260201-001`
- `proposal:skip:RS-20260201-001`

## Example Proposal Message

```
**Royal Scot Golf & Bowl** (Lansing, MI)

• 27 holes • semi-private • tech: simulator • alt: footgolf
• 4722 W Grand River Ave, Lansing, MI 48906, USA
• +1-517-321-6220 • royalscot.net
• Tee sets: 4 • Holes data: 72 • Amenities: 6

Proposal: `RS-20260201-001`
[ ✅ Ingest ] [ 📄 View JSON ] [ ⏭️ Skip ]
```

## Status After Actions

**After Ingest:**
- Message edited to show "✅ Ingested at 09:14pm"
- Buttons disabled
- Proposal status: "ingested"
- Course ID and snapshot ID stored

**After Skip:**
- Message edited to show "⏭️ Skipped"
- Buttons disabled
- Proposal status: "skipped"

**After View JSON:**
- JSON file sent as document
- Original message unchanged
- Proposal status unchanged
