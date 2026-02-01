# Agent Integration: Handling Proposal Callbacks

## Quick Start

When you (the agent) receive a Telegram message, **ALWAYS check if it starts with `proposal:`** before processing it normally.

## Integration Code

Add this to your message preprocessing (before sending to LLM):

```python
def preprocess_telegram_message(message):
    """Preprocess Telegram messages - intercept proposal callbacks."""
    text = message.get("text", "")
    
    # CRITICAL: Handle proposal callbacks before LLM processing
    if text.startswith("proposal:"):
        import sys
        from pathlib import Path
        
        # Add proposal manager to path
        proposal_path = Path("/root/clawd/skills_for_moltbot/course-proposal-manager")
        if proposal_path.exists():
            sys.path.insert(0, str(proposal_path))
            from callback_handler import handle_telegram_callback_message
            
            # Extract message details
            chat_id = str(message.get("chat", {}).get("id", ""))
            from_user_id = str(message.get("from", {}).get("id", ""))
            message_id = message.get("message_id")
            
            # Handle callback
            result = handle_telegram_callback_message(
                message_text=text,
                chat_id=chat_id,
                from_user_id=from_user_id,
                message_id=message_id
            )
            
            # Execute instructions (you'll need to implement these Telegram API calls)
            if result["kind"] == "multiple":
                for instruction in result["instructions"]:
                    execute_telegram_instruction(instruction)
            else:
                execute_telegram_instruction(result)
            
            # Return True to indicate message was handled (don't send to LLM)
            return {"handled": True, "stop_processing": True}
    
    # Continue normal processing
    return {"handled": False}


def execute_telegram_instruction(instruction):
    """Execute a Telegram instruction - replace with your actual Telegram API calls."""
    # TODO: Replace these with your actual Telegram API functions
    
    if instruction["kind"] == "send_message":
        # YOUR_TELEGRAM_API.send_message(
        #     chat_id=instruction["chat_id"],
        #     text=instruction["text"],
        #     parse_mode="Markdown"
        # )
        print(f"[TELEGRAM] Send to {instruction['chat_id']}: {instruction['text'][:100]}...")
    
    elif instruction["kind"] == "send_file":
        # YOUR_TELEGRAM_API.send_document(
        #     chat_id=instruction["chat_id"],
        #     document=instruction["file"]["bytes"],
        #     filename=instruction["file"]["filename"]
        # )
        # if instruction.get("text"):
        #     YOUR_TELEGRAM_API.send_message(instruction["chat_id"], instruction["text"])
        print(f"[TELEGRAM] Send file to {instruction['chat_id']}: {instruction['file']['filename']}")
    
    elif instruction["kind"] == "edit_message":
        edit = instruction["edit"]
        # YOUR_TELEGRAM_API.edit_message_text(
        #     chat_id=edit["chat_id"],
        #     message_id=edit["message_id"],
        #     text=edit["new_text"],
        #     parse_mode="Markdown",
        #     reply_markup=edit.get("reply_markup")
        # )
        print(f"[TELEGRAM] Edit message {edit['message_id']} in {edit['chat_id']}")
```

## What You Need to Provide

To complete the integration, I need:

1. **Where messages are received** - The function/file that receives Telegram messages
2. **Telegram API functions** - How to send messages, files, and edit messages in your system

**Example signatures I need:**
- `send_telegram_message(chat_id, text, parse_mode=None)` 
- `send_telegram_document(chat_id, document, filename=None)`
- `edit_telegram_message_text(chat_id, message_id, text, parse_mode=None, reply_markup=None)`

## Testing

Once integrated:

1. **Manual test:** Send `proposal:view_json:TO-20260201-001` as a message
2. **Expected:** Receive JSON file or "proposal not found"
3. **Button test:** Click "Ingest" button on proposal card
4. **Expected:** Card updates + receipt message

## Current Status

✅ Callback handler implemented  
✅ Safety checks in place  
✅ Dual instructions (edit + receipt)  
✅ Idempotency working  
⏳ **Waiting for:** Message handler location to add routing
