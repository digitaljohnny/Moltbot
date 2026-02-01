# Course Proposal Manager - Integration Guide

## Overview

This skill provides a confirm-then-ingest workflow for golf course data. When a golf-course-research subagent completes, it creates a proposal that the user can approve, view, or skip before ingestion.

## Architecture

```
Golf Course Research → Course JSON → Proposal Manager → Telegram Message
                                                          ↓
                                                    [User Action]
                                                          ↓
                                    ┌─────────────────────┼─────────────────────┐
                                    ↓                     ↓                     ↓
                                 Ingest              View JSON               Skip
                                    ↓                     ↓                     ↓
                            POST to API          Send JSON File         Mark Skipped
```

## Integration Steps

### 1. Update Golf Course Research Skill

After the research skill completes and returns course JSON, add this logic:

```python
import os
import sys
sys.path.append('/root/clawd/skills/course-proposal-manager')
from proposal_manager import (
    create_proposal,
    format_proposal_message,
    auto_ingest_if_enabled
)

# After research completes
course_json = {...}  # Full JSON from golf-course-research

# Check auto-ingest mode
result = auto_ingest_if_enabled(course_json)
if result:
    # Auto-ingest enabled - ingest directly
    return {
        "status": "ingested",
        "course_id": result["courseId"],
        "snapshot_id": result["snapshotId"],
        "message": f"Ingested ✅ {result['courseId']}"
    }
else:
    # Confirm-then-ingest mode - create proposal
    proposal_id = create_proposal(
        payload=course_json,
        agent_label="golf-course-research",
        run_id=operation_id  # From current operation
    )
    
    message = format_proposal_message(proposal_id, course_json)
    
    # Return proposal info for Telegram integration
    return {
        "status": "proposal_created",
        "proposal_id": proposal_id,
        "message": message,
        "buttons": [
            [{"text": "✅ Ingest", "callback_data": f"ingest:{proposal_id}"}],
            [{"text": "📄 View JSON", "callback_data": f"view:{proposal_id}"}],
            [{"text": "⏭️ Skip", "callback_data": f"skip:{proposal_id}"}]
        ]
    }
```

### 2. Telegram Message Sending

When the agent receives a proposal, send it via Telegram:

```python
# In agent's Telegram integration
if result["status"] == "proposal_created":
    telegram.send_message(
        chat_id=chat_id,
        text=result["message"],
        reply_markup={
            "inline_keyboard": result["buttons"]
        },
        parse_mode="Markdown"
    )
```

### 3. Handle Telegram Callbacks

Set up a callback handler for inline button presses:

```python
from proposal_manager import ingest_proposal, skip_proposal, get_proposal

def handle_callback(callback_query):
    """Handle Telegram inline button callbacks."""
    callback_data = callback_query.data
    action, proposal_id = callback_data.split(":", 1)
    message_id = callback_query.message.message_id
    chat_id = callback_query.message.chat.id
    
    if action == "ingest":
        try:
            result = ingest_proposal(proposal_id)
            # Edit message to show success
            telegram.edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=f"{original_message}\n\n✅ **Ingested** at {datetime.now().strftime('%I:%M%p')}\nCourse ID: `{result['course_id']}`",
                parse_mode="Markdown"
            )
            # Disable buttons
            telegram.edit_message_reply_markup(
                chat_id=chat_id,
                message_id=message_id,
                reply_markup={"inline_keyboard": []}
            )
        except Exception as e:
            telegram.answer_callback_query(
                callback_query_id=callback_query.id,
                text=f"Failed: {str(e)}",
                show_alert=True
            )
    
    elif action == "view":
        proposal = get_proposal(proposal_id)
        if proposal:
            # Send JSON as file
            course_id = proposal["payload"]["course"]["id"]
            filename = f"{course_id}.json"
            telegram.send_document(
                chat_id=chat_id,
                document=proposal["payload_json"].encode(),
                filename=filename
            )
            telegram.answer_callback_query(
                callback_query_id=callback_query.id,
                text="JSON sent"
            )
    
    elif action == "skip":
        skip_proposal(proposal_id)
        telegram.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=f"{original_message}\n\n⏭️ **Skipped**",
            parse_mode="Markdown"
        )
        telegram.edit_message_reply_markup(
            chat_id=chat_id,
            message_id=message_id,
            reply_markup={"inline_keyboard": []}
        )
```

## Configuration

### Environment Variables

Add to Moltbot's environment (`.env` or docker-compose):

```bash
COURSE_INGEST_URL=http://host.docker.internal:8088
COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
AUTO_INGEST=false  # Set to "true" to skip proposals and ingest directly
```

### Database Location

Proposals are stored at `/root/clawd/data/course_proposals.db` inside the Moltbot container.

## Workflow Examples

### Example 1: Single Course Research

1. User: "Research Royal Scot in Lansing, MI"
2. Agent runs golf-course-research skill
3. Skill completes → Returns course JSON
4. Proposal manager creates proposal `RS-20260201-001`
5. Agent sends Telegram message with buttons
6. User taps "Ingest"
7. Proposal ingested → Message updated with status

### Example 2: Multiple Courses (Batch)

1. User: "Research all courses in East Lansing"
2. Agent launches 3 subagents
3. Each completes → Creates separate proposal
4. User sees 3 separate messages, each with own buttons
5. User can ingest/skip independently
6. No mix-ups because each proposal has unique ID

### Example 3: Auto-Ingest Mode

1. Set `AUTO_INGEST=true`
2. Research completes → Ingested immediately
3. User receives: "Ingested ✅ course_royal_scot_lansing_mi"
4. No proposal created, no buttons

## Edge Cases Handled

- **Double-click**: Buttons disabled after first success
- **API down**: Proposal marked "failed", Ingest button remains enabled
- **Expired proposals**: Auto-marked as expired after 48h
- **Restart**: Proposals persist in SQLite
- **Multiple proposals**: Each handled independently with unique ID

## Testing

Test the proposal manager:

```bash
# Inside Moltbot container
docker exec moltbot-setup python3 /root/clawd/skills/course-proposal-manager/proposal_manager.py

# Test proposal creation
python3 << EOF
from proposal_manager import create_proposal, get_proposal
import json

test_course = {
    "course": {
        "id": "course_test_123",
        "name": "Test Course",
        "city": "Test City",
        "state": "MI"
    }
}

proposal_id = create_proposal(test_course, "test")
print(f"Created: {proposal_id}")
proposal = get_proposal(proposal_id)
print(f"Retrieved: {proposal['course_name']}")
EOF
```

## Next Steps

1. ✅ Proposal storage system created (SQLite)
2. ✅ Helper functions implemented
3. ⏳ Integrate with golf-course-research skill
4. ⏳ Set up Telegram callback handler in Clawdbot
5. ⏳ Test end-to-end workflow

## Notes

- Proposal IDs are human-readable for easy reference
- JSON files sent via Telegram are named by course_id
- Proposals expire after 48 hours (configurable)
- Database survives container restarts
- All ingestion uses the same API endpoint as manual ingestion
