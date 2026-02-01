# Message-Based Callback Integration (Pattern A)

Since your system uses **message-based callbacks** (clicking a button sends a message with callback_data as text), here's the exact integration code.

## Integration Point

In your normal incoming message handler, add this check:

```python
def handle_incoming_message(message):
    """Your existing message handler."""
    text = message.get("text", "")
    chat_id = message.get("chat", {}).get("id")
    message_id = message.get("message_id")
    user_id = message.get("from", {}).get("id")
    
    # Check if it's a proposal callback
    if text.startswith("proposal:"):
        from callback_handler import handle_telegram_callback_message
        
        # Optional: Set allowed user IDs for safety
        ALLOWED_USER_IDS = [123456789]  # Replace with your Telegram user ID
        
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            message_id=message_id,
            user_id=user_id,
            allowed_user_ids=ALLOWED_USER_IDS  # Optional safety check
        )
        
        # Handle the result
        if result["success"]:
            if result["response_type"] == "file":
                # Send JSON file
                send_telegram_document(
                    chat_id=chat_id,
                    document=result["send_file"]["content"],
                    filename=result["send_file"]["filename"]
                )
                # Also send confirmation message
                send_telegram_message(chat_id, result["response_text"])
            else:
                # Send response message
                send_telegram_message(chat_id, result["response_text"], parse_mode="Markdown")
            
            # If we have the original proposal message_id stored, edit it
            if result.get("edit_message"):
                # You'd need to store proposal_id -> message_id mapping
                # For now, just send the status as a new message
                pass
        else:
            # Send error message
            send_telegram_message(chat_id, result["response_text"])
        
        return  # Don't process as normal message
    
    # ... rest of your message handling
```

## Minimal Integration (Simplest)

If you want the absolute minimum:

```python
def handle_incoming_message(message):
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        from callback_handler import handle_telegram_callback_message
        
        result = handle_telegram_callback_message(
            text,
            message["chat"]["id"],
            message.get("message_id"),
            message.get("from", {}).get("id")
        )
        
        # Send response
        send_message(message["chat"]["id"], result["response_text"])
        
        # Send file if needed
        if result.get("send_file"):
            send_document(message["chat"]["id"], **result["send_file"])
        
        return
```

## Response Format

The handler returns:

```python
{
    "success": bool,
    "action": str,  # "ingest", "view_json", or "skip"
    "proposal_id": str,
    "response_type": str,  # "message" or "file"
    "response_text": str,  # Message to send
    "send_file": Optional[dict],  # If response_type == "file"
    "edit_message": Optional[dict],  # If original should be edited
    "error": Optional[str]  # If success == False
}
```

## Safety Checks Included

The handler automatically checks:
1. ✅ Proposal exists
2. ✅ Proposal is pending (not already ingested/skipped)
3. ✅ Proposal not expired
4. ✅ Optional: User ID authorization (if `allowed_user_ids` provided)

## Example Flow

**User clicks "Ingest" button:**
1. Message arrives: `"proposal:ingest:RS-20260201-001"`
2. Handler processes → Ingests course
3. Returns: `{"response_text": "✅ Ingested at 09:14pm\nCourse ID: ..."}`
4. You send that message to chat

**User clicks "View JSON" button:**
1. Message arrives: `"proposal:view_json:RS-20260201-001"`
2. Handler processes → Loads proposal
3. Returns: `{"response_type": "file", "send_file": {...}}`
4. You send the JSON file

**User clicks "Skip" button:**
1. Message arrives: `"proposal:skip:RS-20260201-001"`
2. Handler processes → Marks skipped
3. Returns: `{"response_text": "⏭️ Skipped"}`
4. You send that message to chat

## Storing Proposal Message IDs (Optional)

If you want to edit the original proposal message after actions, store the mapping:

```python
# When creating proposal message
proposal_message = send_message(chat_id, message_text, reply_markup=buttons)
store_proposal_message_id(proposal_id, proposal_message["message_id"])

# When handling callback
original_message_id = get_proposal_message_id(proposal_id)
if original_message_id and result.get("edit_message"):
    edit_message(chat_id, original_message_id, **result["edit_message"])
```

But for simplicity, just sending a new status message works fine too!

## Complete Example

```python
import os
sys.path.append('/root/clawd/skills/course-proposal-manager')
from callback_handler import handle_telegram_callback_message

# Your Telegram user ID (get from message["from"]["id"] in a test message)
MY_TELEGRAM_USER_ID = 123456789  # Replace with your actual ID

def on_telegram_message(message):
    """Handle incoming Telegram messages."""
    text = message.get("text", "")
    chat_id = message["chat"]["id"]
    message_id = message.get("message_id")
    user_id = message.get("from", {}).get("id")
    
    # Handle proposal callbacks
    if text.startswith("proposal:"):
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            message_id=message_id,
            user_id=user_id,
            allowed_user_ids=[MY_TELEGRAM_USER_ID]  # Safety check
        )
        
        # Send response
        send_message(chat_id, result["response_text"], parse_mode="Markdown")
        
        # Send file if viewing JSON
        if result.get("send_file"):
            send_document(
                chat_id,
                document=result["send_file"]["content"],
                filename=result["send_file"]["filename"]
            )
        
        return  # Don't process as normal message
    
    # ... handle other messages normally
```

That's it! The handler does all the heavy lifting - you just need to wire it into your message handler.
