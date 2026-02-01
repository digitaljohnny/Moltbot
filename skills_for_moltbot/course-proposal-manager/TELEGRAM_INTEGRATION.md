# Telegram Integration Guide

This guide shows how to integrate course proposal callbacks with Telegram, supporting both message-based and true callback_query formats.

## Testing: Determine Your Callback Format

**Before implementing, test what format you receive:**

1. Send a test message with inline buttons:
```python
buttons = [[{"text": "Test", "callback_data": "test:123"}]]
send_message("Test button", reply_markup={"inline_keyboard": buttons})
```

2. Click the button and check what arrives:
   - **Option A**: A new message with text `"test:123"` → Use message-based handler
   - **Option B**: A callback_query object → Use callback_query handler

## Integration Patterns

### Pattern 1: Message-Based Callbacks

If clicking a button sends a message with the callback_data as text:

```python
from callback_handler import handle_telegram_callback_message

def on_telegram_message(message):
    """Handle incoming Telegram messages."""
    text = message.get("text", "")
    
    # Check if it's a proposal callback
    if text.startswith("proposal:"):
        chat_id = message["chat"]["id"]
        message_id = message.get("message_id")
        
        # Handle the callback
        result = handle_telegram_callback_message(text, chat_id, message_id)
        
        if result["success"]:
            # Send response message
            send_message(chat_id, result["response_text"], parse_mode="Markdown")
            
            # Edit original proposal message (if you stored message_id)
            if result.get("edit_message") and message_id:
                edit_message(chat_id, message_id, **result["edit_message"])
            
            # Send JSON file if viewing
            if result.get("send_file"):
                send_document(chat_id, **result["send_file"])
        else:
            send_message(chat_id, f"❌ Error: {result.get('error')}")
```

### Pattern 2: True Callback Query

If you receive a proper Telegram callback_query object:

```python
from callback_handler import handle_telegram_callback_query

def on_telegram_callback_query(callback_query):
    """Handle Telegram callback queries."""
    result = handle_telegram_callback_query(callback_query)
    
    callback_query_id = callback_query["id"]
    chat_id = callback_query["message"]["chat"]["id"]
    message_id = callback_query["message"]["message_id"]
    
    if result["success"]:
        # Answer callback (removes loading state)
        answer_callback_query(callback_query_id, "Processing...")
        
        # Edit original message
        if result.get("edit_message"):
            edit_message_text(
                chat_id=chat_id,
                message_id=message_id,
                text=result["edit_message"]["text"],
                reply_markup=result["edit_message"].get("reply_markup"),
                parse_mode="Markdown"
            )
        
        # Send file if viewing JSON
        if result.get("send_file"):
            send_document(chat_id, **result["send_file"])
    else:
        # Show error alert
        answer_callback_query(
            callback_query_id,
            result.get("error", "Unknown error"),
            show_alert=True
        )
```

## Complete Integration Example

Here's a complete example that handles both patterns:

```python
import os
import sys
sys.path.append('/root/clawd/skills/course-proposal-manager')
from callback_handler import (
    handle_telegram_callback_message,
    handle_telegram_callback_query,
    parse_callback_data
)

def handle_telegram_update(update):
    """Handle any Telegram update (message or callback_query)."""
    
    # Check if it's a callback_query
    if "callback_query" in update:
        callback_query = update["callback_query"]
        callback_data = callback_query.get("data", "")
        
        if callback_data.startswith("proposal:"):
            handle_telegram_callback_query(callback_query)
        return
    
    # Check if it's a message with proposal callback
    if "message" in update:
        message = update["message"]
        text = message.get("text", "")
        
        if text.startswith("proposal:"):
            handle_telegram_callback_message(
                text,
                message["chat"]["id"],
                message.get("message_id")
            )
        return
```

## Callback Data Format

All callbacks use this format:
```
proposal:{action}:{proposal_id}
```

Where:
- `action` is one of: `ingest`, `view_json`, `skip`
- `proposal_id` is the proposal ID (e.g., `RS-20260201-001`)

Examples:
- `proposal:ingest:RS-20260201-001`
- `proposal:view_json:RS-20260201-001`
- `proposal:skip:RS-20260201-001`

## Response Format

The handler returns a dict with:

```python
{
    "success": bool,
    "action": str,  # "ingest", "view_json", or "skip"
    "proposal_id": str,
    "response_text": str,  # Message to send/reply
    "edit_message": {  # Optional: if message should be edited
        "text": str,
        "reply_markup": dict  # Empty keyboard to disable buttons
    },
    "send_file": {  # Optional: if JSON file should be sent
        "content": bytes,
        "filename": str,
        "content_type": str
    },
    "error": str  # Only if success=False
}
```

## Message Editing

After ingest/skip, the original proposal message is edited to show status:

**Before:**
```
Royal Scot Golf & Bowl (Lansing, MI)
...
Proposal: RS-20260201-001
[ Ingest ] [ View JSON ] [ Skip ]
```

**After Ingest:**
```
Royal Scot Golf & Bowl (Lansing, MI)
...
Proposal: RS-20260201-001

✅ Ingested at 09:14pm
Course ID: course_royal_scot_lansing_mi
```

**After Skip:**
```
Royal Scot Golf & Bowl (Lansing, MI)
...
Proposal: RS-20260201-001

⏭️ Skipped
```

Buttons are disabled (empty keyboard) after any action.

## Error Handling

- **Proposal not found**: Returns error, user can retry
- **Ingest API down**: Returns error, Ingest button remains enabled
- **Already ingested**: Shows "Already ingested" message, disables buttons
- **Invalid callback**: Returns error message

## Testing Checklist

1. ✅ Create a test proposal
2. ✅ Send proposal message with buttons
3. ✅ Click "Ingest" → Verify ingestion, message edit, buttons disabled
4. ✅ Click "View JSON" → Verify JSON file sent
5. ✅ Click "Skip" → Verify message edit, buttons disabled
6. ✅ Test double-click (should handle gracefully)
7. ✅ Test expired proposal (should show error)
8. ✅ Test with API down (should show error, allow retry)

## Next Steps

1. Test your callback format (message vs callback_query)
2. Integrate the appropriate handler pattern
3. Test end-to-end workflow
4. Deploy and monitor
