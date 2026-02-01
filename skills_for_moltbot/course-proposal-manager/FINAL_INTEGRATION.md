# Final Integration Guide - Message-Based Callbacks (Pattern A)

## Confirmed: Pattern A (Message-Based)

Your system uses **message-based callbacks** - clicking a button sends a message with the callback_data as text.

## Exact Integration Code

Add this to your incoming message handler:

```python
import os
import sys
sys.path.append('/root/clawd/skills/course-proposal-manager')
from callback_handler import handle_telegram_callback_message

# Your Telegram user ID (for safety check)
MY_TELEGRAM_USER_ID = 123456789  # Replace with your actual ID

def handle_incoming_message(message):
    """Your existing Telegram message handler."""
    text = message.get("text", "")
    
    # Handle proposal callbacks
    if text.startswith("proposal:"):
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=message["chat"]["id"],
            message_id=message.get("message_id"),
            user_id=message.get("from", {}).get("id"),
            allowed_user_ids=[MY_TELEGRAM_USER_ID]  # Optional safety
        )
        
        # Send response message
        send_message(message["chat"]["id"], result["response_text"], parse_mode="Markdown")
        
        # Send file if viewing JSON
        if result.get("send_file"):
            send_document(
                message["chat"]["id"],
                document=result["send_file"]["content"],
                filename=result["send_file"]["filename"]
            )
        
        return  # Don't process as normal message
    
    # ... rest of your message handling
```

## Handler Signature

```python
handle_telegram_callback_message(
    message_text: str,           # e.g., "proposal:ingest:RS-20260201-001"
    chat_id: str,                # Telegram chat ID
    message_id: int = None,      # Current message ID (optional)
    user_id: int = None,         # Telegram user ID (for auth)
    allowed_user_ids: list = None # Optional: list of allowed user IDs
) -> Dict
```

## Return Value

```python
{
    "success": bool,
    "action": str,              # "ingest", "view_json", or "skip"
    "proposal_id": str,         # e.g., "RS-20260201-001"
    "response_type": str,       # "message" or "file"
    "response_text": str,       # Message to send to user
    "send_file": Optional[dict], # If response_type == "file"
    "error": Optional[str]       # If success == False
}
```

## Safety Checks (Built-In)

The handler automatically validates:
1. ✅ Proposal exists
2. ✅ Proposal is pending (not ingested/skipped)
3. ✅ Proposal not expired (48h default)
4. ✅ Optional: User ID matches allowed list

## Example Responses

**Ingest Success:**
```python
{
    "success": True,
    "action": "ingest",
    "proposal_id": "RS-20260201-001",
    "response_type": "message",
    "response_text": "✅ **Ingested** at 09:14pm\nCourse ID: `course_royal_scot_lansing_mi`\nSnapshot: `abc-123-def`"
}
```

**View JSON:**
```python
{
    "success": True,
    "action": "view_json",
    "proposal_id": "RS-20260201-001",
    "response_type": "file",
    "response_text": "📄 JSON for Royal Scot Golf & Bowl",
    "send_file": {
        "content": b"{...json...}",
        "filename": "course_royal_scot_lansing_mi.json",
        "content_type": "application/json"
    }
}
```

**Skip:**
```python
{
    "success": True,
    "action": "skip",
    "proposal_id": "RS-20260201-001",
    "response_type": "message",
    "response_text": "⏭️ Skipped"
}
```

**Error:**
```python
{
    "success": False,
    "error": "Proposal not found",
    "response_type": "message",
    "response_text": "❌ Proposal RS-20260201-001 not found"
}
```

## Complete Minimal Example

```python
def on_message(message):
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        from callback_handler import handle_telegram_callback_message
        
        result = handle_telegram_callback_message(
            text,
            message["chat"]["id"],
            message.get("message_id"),
            message.get("from", {}).get("id")
        )
        
        send_message(message["chat"]["id"], result["response_text"])
        
        if result.get("send_file"):
            send_document(message["chat"]["id"], **result["send_file"])
        
        return
    
    # Handle other messages...
```

That's it! The handler does all the work - you just wire it into your message handler.
