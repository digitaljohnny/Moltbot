---
name: course-proposal-manager
description: Manages course ingestion proposals with confirm-then-ingest workflow. Stores proposals, handles Telegram inline button callbacks, and ingests courses on approval.
metadata: {"moltbot":{"emoji":"📋"}}
---

# 📋 Course Proposal Manager Skill

Manages course ingestion proposals with a confirm-then-ingest workflow. When a subagent completes golf course research, this skill creates a proposal that the user can approve, skip, or view before ingesting.

## When to Use

Use this skill when:
- A golf course research subagent completes and returns course JSON
- You need to present course data to the user for approval before ingestion
- You want to track pending course proposals
- You need to handle batch proposals from multiple subagents
- **A Telegram message starts with `proposal:`** (callback from inline button)

## Handling Proposal Callbacks (CRITICAL - EXECUTE IMMEDIATELY)

**CRITICAL RULE**: When you receive ANY Telegram message that starts with `proposal:`, you MUST handle it immediately and STOP. Do NOT process it as normal conversation.

### Step-by-Step: Handle `proposal:*` Messages

When you see a message like `proposal:ingest:TO-20260201-001` or `proposal:view_json:RS-20260201-001`:

**Step 1: Import the handler**

```python
import sys
import os
import tempfile
from pathlib import Path

# Add proposal manager to Python path
proposal_path = Path("/home/node/clawd/skills_for_moltbot/course-proposal-manager")
if proposal_path.exists():
    sys.path.insert(0, str(proposal_path))
    from callback_handler import handle_telegram_callback_message
else:
    # Handler not found - send error and stop
    message(action="send", channel="telegram", target=chat_id, message="❌ Proposal handler not found")
    return  # STOP - don't process as normal message
```

**Step 2: Extract message details**

```python
# From the incoming Telegram message:
text = message.get("text", "").strip()  # e.g., "proposal:view_json:TO-20260201-001"
chat_id = str(message.get("chat", {}).get("id", ""))
from_user_id = str(message.get("from", {}).get("id", ""))
message_id = message.get("message_id")
```

**Step 3: Call the handler**

```python
result = handle_telegram_callback_message(
    message_text=text,
    chat_id=chat_id,
    from_user_id=from_user_id,
    message_id=message_id
)
```

**Step 4: Execute the returned instructions**

The handler returns instructions that you must execute using Moltbot's `message()` tool:

```python
# Handle multiple instructions (for ingest/skip actions)
if result.get("kind") == "multiple":
    for instruction in result.get("instructions", []):
        execute_instruction(instruction)
else:
    execute_instruction(result)

def execute_instruction(instruction):
    kind = instruction.get("kind")
    chat_id = instruction.get("chat_id")
    
    if kind == "send_message":
        # Send text message
        message(
            action="send",
            channel="telegram",
            target=chat_id,
            message=instruction.get("text", ""),
            parse_mode="Markdown"
        )
    
    elif kind == "send_file":
        # Send JSON file
        file_data = instruction.get("file", {})
        filename = file_data.get("filename", "course.json")
        file_bytes = file_data.get("bytes", b"")
        
        # Write to temp file (message tool needs a path)
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.json') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            # Send file
            message(
                action="send",
                channel="telegram",
                target=chat_id,
                path=tmp_path,
                filename=filename
            )
            
            # Optionally send accompanying text
            if instruction.get("text"):
                message(
                    action="send",
                    channel="telegram",
                    target=chat_id,
                    message=instruction.get("text", ""),
                    parse_mode="Markdown"
                )
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    elif kind == "edit_message":
        # Edit existing message (updates proposal card, clears buttons)
        edit_data = instruction.get("edit", {})
        message(
            action="edit",
            channel="telegram",
            target=chat_id,
            messageId=edit_data.get("message_id"),
            message=edit_data.get("new_text", ""),
            parse_mode="Markdown",
            reply_markup=edit_data.get("reply_markup")  # Clears buttons if provided
        )
```

**Step 5: STOP - Do NOT send to LLM**

After executing instructions, **immediately return**. Do NOT process the `proposal:*` message as normal conversation.

### Complete Example

```python
# When you receive a Telegram message:
if message.get("text", "").strip().startswith("proposal:"):
    # This is a proposal callback - handle it and stop
    import sys
    import os
    import tempfile
    from pathlib import Path
    
    proposal_path = Path("/home/node/clawd/skills_for_moltbot/course-proposal-manager")
    if not proposal_path.exists():
        message(action="send", channel="telegram", target=chat_id, message="❌ Proposal handler not found")
        return  # STOP
    
    sys.path.insert(0, str(proposal_path))
    from callback_handler import handle_telegram_callback_message
    
    text = message.get("text", "").strip()
    chat_id = str(message.get("chat", {}).get("id", ""))
    from_user_id = str(message.get("from", {}).get("id", ""))
    message_id = message.get("message_id")
    
    result = handle_telegram_callback_message(
        message_text=text,
        chat_id=chat_id,
        from_user_id=from_user_id,
        message_id=message_id
    )
    
    # Execute instructions (use the execute_instruction function above)
    if result.get("kind") == "multiple":
        for instruction in result.get("instructions", []):
            execute_instruction(instruction)
    else:
        execute_instruction(result)
    
    return  # STOP - don't process as normal message
```

### Quick Reference

**Message Pattern:** `proposal:{action}:{proposal_id}`
- Actions: `ingest`, `view_json`, `skip`
- Example: `proposal:ingest:TO-20260201-001`

**Handler Location:** `/home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py`

**Always check for `proposal:` prefix before processing any Telegram message!**

## Proposal Storage

Proposals are stored in SQLite at `/home/node/clawd/data/course_proposals.db` with the following schema:

```sql
CREATE TABLE IF NOT EXISTS proposals (
  proposal_id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  course_name TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, ingested, skipped, expired
  ingested_at TIMESTAMPTZ,
  snapshot_id TEXT,
  course_id TEXT,
  agent_label TEXT,
  run_id TEXT
);

CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_expires_at_idx ON proposals(expires_at);
```

## Functions

### 1. Create Proposal

When a subagent completes course research:

```python
# Generate proposal ID
proposal_id = f"{course_id[:2].upper()}-{date_str}-{seq:03d}"
# Example: "RS-20260201-001"

# Store proposal
store_proposal(
    proposal_id=proposal_id,
    payload=course_json,  # Full JSON from research
    course_name=course_json['course']['name'],
    city=course_json['course']['city'],
    state=course_json['course']['state'],
    agent_label="golf-course-research",
    run_id=operation_id,
    expires_hours=48
)
```

### 2. Format Proposal Message

Create a human-readable Telegram message:

```
{course_name} ({city}, {state})

• {holes} holes • {access} • tech: {tech} • alt: {alt_types}
• {address}
• {phone} • {domain}
• Tee sets: {tee_set_count} • Holes data: {hole_count} • Amenities: {amenity_count}

Proposal: {proposal_id}
[ Ingest ] [ View JSON ] [ Skip ]
```

### 3. Handle Button Callbacks

**Ingest Button:**
- Load proposal by `proposal_id`
- POST payload to `{COURSE_INGEST_URL}/v1/courses/ingest`
- Update proposal status to 'ingested'
- Store `course_id` and `snapshot_id`
- Edit message: "Status: ingested ✅ at {time}"

**View JSON Button:**
- Load proposal by `proposal_id`
- Send JSON as file attachment: `{course_id}.json`

**Skip Button:**
- Update proposal status to 'skipped'
- Edit message: "Status: skipped"

## Implementation

The skill provides helper functions:

- `create_proposal(payload, agent_label, run_id)` → proposal_id
- `get_proposal(proposal_id)` → proposal dict
- `ingest_proposal(proposal_id)` → {course_id, snapshot_id}
- `skip_proposal(proposal_id)` → success
- `list_pending_proposals()` → list of proposals
- `cleanup_expired_proposals()` → count removed

## Environment Variables

- `COURSE_INGEST_URL` - API endpoint (default: `http://host.docker.internal:8088`)
- `COURSE_INGEST_TOKEN` - Bearer token for API
- `AUTO_INGEST` - If "true", skip proposal and ingest directly (default: false)

## Workflow

1. **Subagent completes** → Returns course JSON
2. **Check AUTO_INGEST**:
   - If `true`: Ingest directly, return receipt
   - If `false`: Create proposal, send proposal message
3. **User taps button** → Handle callback:
   - Ingest: POST to API, update status
   - View: Send JSON file
   - Skip: Mark skipped
4. **Cleanup**: Expired proposals auto-removed (48h default)

## Edge Cases

- **Double-click ingest**: Buttons disabled after first success; API is idempotent
- **API down**: Mark proposal as "failed", leave Ingest button enabled for retry
- **Multiple proposals**: Each gets unique proposal_id, handled independently
- **Restart**: Proposals persist in SQLite

## Example Usage

```python
# After golf-course-research completes
course_json = {...}  # From research skill

if os.getenv("AUTO_INGEST") == "true":
    # Auto-ingest mode
    result = ingest_course(course_json)
    send_message(f"Ingested ✅ {result['courseId']}")
else:
    # Confirm-then-ingest mode
    proposal_id = create_proposal(course_json, "golf-course-research", operation_id)
    message = format_proposal_message(proposal_id, course_json)
    send_message_with_buttons(message, proposal_id)
```
