# Buddy Instructions: Handling Proposal Callbacks

## What You Need to Do

When you receive a Telegram message that starts with `proposal:`, follow these steps **immediately** and **stop** - do NOT process it as normal conversation.

## Quick Reference

**Message Pattern:** `proposal:{action}:{proposal_id}`
- Actions: `ingest`, `view_json`, `skip`
- Example: `proposal:view_json:TO-20260201-001`

**Handler Location:** `/home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py`

## Step-by-Step Execution

### 1. Check if message starts with `proposal:`

```python
if not message.get("text", "").strip().startswith("proposal:"):
    # Not a proposal callback - continue normal processing
    return
```

### 2. Import the handler

```python
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
```

### 3. Extract message context

```python
text = message.get("text", "").strip()
chat_id = str(message.get("chat", {}).get("id", ""))
from_user_id = str(message.get("from", {}).get("id", ""))
message_id = message.get("message_id")
```

### 4. Call the handler

```python
result = handle_telegram_callback_message(
    message_text=text,
    chat_id=chat_id,
    from_user_id=from_user_id,
    message_id=message_id
)
```

### 5. Execute instructions

```python
def execute_instruction(instruction):
    kind = instruction.get("kind")
    chat_id = instruction.get("chat_id")
    
    if kind == "send_message":
        message(
            action="send",
            channel="telegram",
            target=chat_id,
            message=instruction.get("text", ""),
            parse_mode="Markdown"
        )
    
    elif kind == "send_file":
        file_data = instruction.get("file", {})
        filename = file_data.get("filename", "course.json")
        file_bytes = file_data.get("bytes", b"")
        
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.json') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            message(
                action="send",
                channel="telegram",
                target=chat_id,
                path=tmp_path,
                filename=filename
            )
            if instruction.get("text"):
                message(
                    action="send",
                    channel="telegram",
                    target=chat_id,
                    message=instruction.get("text", ""),
                    parse_mode="Markdown"
                )
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    elif kind == "edit_message":
        edit_data = instruction.get("edit", {})
        message(
            action="edit",
            channel="telegram",
            target=chat_id,
            messageId=edit_data.get("message_id"),
            message=edit_data.get("new_text", ""),
            parse_mode="Markdown",
            reply_markup=edit_data.get("reply_markup")
        )

# Execute the result
if result.get("kind") == "multiple":
    for instruction in result.get("instructions", []):
        execute_instruction(instruction)
else:
    execute_instruction(result)
```

### 6. STOP - Do NOT send to LLM

After executing instructions, **immediately return**. Do NOT process the message as normal conversation.

## Expected Results

- **`proposal:view_json:<ID>`**: Should return JSON file or error message
- **`proposal:ingest:<ID>`**: Should ingest course, update card, send receipt
- **`proposal:skip:<ID>`**: Should mark skipped, update card, send receipt

## Dependencies

The handler code uses `requests` library for HTTP calls. If `requests` is not available in your Python environment, you may need to:

1. Install it: `pip install requests`
2. Or modify `proposal_manager.py` to use `urllib.request` instead

## Testing

To test, send a message like:
```
proposal:view_json:TO-20260201-001
```

You should get either:
- ✅ JSON file attachment, OR
- ✅ Error message (not a conversational response)

If you get a conversational response, the routing isn't working yet.
