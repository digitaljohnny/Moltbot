# Idempotency and Dual Instructions

## Overview

The proposal handler now includes two production-grade improvements:

1. **Dual Instructions**: Ingest/skip actions return BOTH an edit instruction (to update the proposal card) AND a receipt message (for audit trail)
2. **Idempotency**: Payload hashing and Idempotency-Key header prevent duplicate ingests

## Dual Instructions Pattern

### Why Both Edit + Receipt?

- **Edit**: Updates the original proposal card, removes buttons, shows status
- **Receipt**: Always sent as a separate message for audit trail
- **Resilience**: If edit fails (old message, permissions), receipt still provides confirmation

### Instruction Format

**Ingest/Skip with stored message_id:**
```python
{
    "kind": "multiple",
    "chat_id": "123456789",
    "instructions": [
        {
            "kind": "edit_message",
            "chat_id": "123456789",
            "edit": {
                "message_id": 42,
                "chat_id": "123456789",
                "new_text": "...updated text...",
                "reply_markup": {"inline_keyboard": []}  # Clear buttons
            }
        },
        {
            "kind": "send_message",
            "chat_id": "123456789",
            "text": "✅ Ingested at 09:14pm\nCourse ID: `course_123`"
        }
    ]
}
```

**Ingest/Skip without stored message_id (receipt only):**
```python
{
    "kind": "send_message",
    "chat_id": "123456789",
    "text": "✅ Ingested at 09:14pm\nCourse ID: `course_123`"
}
```

### Execution

```python
if result["kind"] == "multiple":
    for instruction in result["instructions"]:
        execute_instruction(instruction)
else:
    execute_instruction(result)
```

## Idempotency

### How It Works

1. **Payload Hash**: When creating a proposal, compute SHA-256 hash of normalized JSON
   ```python
   normalized = json.dumps(payload, sort_keys=True, separators=(',', ':'))
   payload_hash = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
   ```

2. **Storage**: Hash is stored in `proposals.payload_hash` column

3. **Idempotency-Key Header**: When ingesting, send hash as header:
   ```python
   headers = {
       "Authorization": f"Bearer {TOKEN}",
       "Content-Type": "application/json",
       "Idempotency-Key": payload_hash
   }
   ```

4. **API Handling**: The ingest API can use this header to:
   - Detect duplicate requests
   - Return the same response for identical payloads
   - Prevent duplicate course/snapshot creation

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS proposals (
    ...
    payload_hash TEXT,  -- SHA-256 hash of normalized payload
    ...
);
```

### Benefits

- **Double-tap protection**: User clicks "Ingest" twice → second request is idempotent
- **Retry safety**: Network errors, retries → same result
- **Parallel safety**: Multiple agents propose same course → only one ingest

## Telegram Edit Message Notes

### Clearing Inline Keyboards

Some Telegram libraries require separate calls to clear buttons:

**Option 1: Single edit call (if supported)**
```python
edit_message_text(
    chat_id=chat_id,
    message_id=message_id,
    text=new_text,
    reply_markup={"inline_keyboard": []}  # Clear buttons
)
```

**Option 2: Separate edit_reply_markup call (if needed)**
```python
# First, edit text
edit_message_text(chat_id, message_id, new_text)

# Then, clear buttons
edit_message_reply_markup(chat_id, message_id, reply_markup={"inline_keyboard": []})
```

The instruction format includes `reply_markup` in the edit instruction. If your library requires separate calls, split the instruction execution accordingly.

## Migration Notes

### Existing Proposals

- Old proposals without `payload_hash` will compute it on-the-fly during ingest
- Migration SQL adds columns safely (IF NOT EXISTS)

### Backward Compatibility

- If `proposal_message_id` is not stored, handler falls back to receipt-only
- If `payload_hash` is missing, it's computed during ingest
- All changes are backward compatible
