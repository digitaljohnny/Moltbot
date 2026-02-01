# Course Proposal Manager

Manages course ingestion proposals with a confirm-then-ingest workflow for Telegram.

## Overview

When a golf course research subagent completes, this skill:
1. Creates a proposal (stored in SQLite)
2. Formats a human-readable Telegram message with inline buttons
3. Handles button callbacks (Ingest/View JSON/Skip)
4. Manages proposal lifecycle (expiration, cleanup)

## Storage

Proposals are stored in SQLite at `/root/clawd/data/course_proposals.db`.

## Usage

### From Agent/Skill

```python
from proposal_manager import (
    create_proposal,
    format_proposal_message,
    ingest_proposal,
    skip_proposal,
    auto_ingest_if_enabled
)

# After golf-course-research completes
course_json = {...}  # From research

# Check if auto-ingest is enabled
result = auto_ingest_if_enabled(course_json)
if result:
    # Already ingested
    send_message(f"Ingested ✅ {result['courseId']}")
else:
    # Create proposal
    proposal_id = create_proposal(course_json, "golf-course-research", operation_id)
    message = format_proposal_message(proposal_id, course_json)
    
    # Send with inline buttons (Telegram format)
    buttons = [
        [{"text": "Ingest", "callback_data": f"ingest:{proposal_id}"}],
        [{"text": "View JSON", "callback_data": f"view:{proposal_id}"}],
        [{"text": "Skip", "callback_data": f"skip:{proposal_id}"}]
    ]
    send_message_with_inline_buttons(message, buttons)
```

### Handle Callbacks

```python
# When user taps button
callback_data = "ingest:RS-20260201-001"
action, proposal_id = callback_data.split(":", 1)

if action == "ingest":
    try:
        result = ingest_proposal(proposal_id)
        edit_message("Status: ingested ✅ at {time}")
        disable_buttons()
    except Exception as e:
        send_message(f"Failed: {e}")
        
elif action == "view":
    proposal = get_proposal(proposal_id)
    send_file(f"{proposal['course_id']}.json", proposal['payload_json'])
    
elif action == "skip":
    skip_proposal(proposal_id)
    edit_message("Status: skipped")
    disable_buttons()
```

## Environment Variables

- `COURSE_INGEST_URL` - API endpoint (default: `http://host.docker.internal:8088`)
- `COURSE_INGEST_TOKEN` - Bearer token
- `AUTO_INGEST` - If "true", skip proposals and ingest directly

## Proposal ID Format

`{PREFIX}-{YYYYMMDD}-{SEQ}`

Example: `RS-20260201-001` (Royal Scot, Feb 1, 2026, first proposal)

## Cleanup

Expired proposals (default: 48 hours) are automatically marked as expired. Run cleanup periodically:

```python
from proposal_manager import cleanup_expired_proposals
count = cleanup_expired_proposals()
```
