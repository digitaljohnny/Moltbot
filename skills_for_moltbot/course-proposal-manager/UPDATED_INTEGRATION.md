# Updated Integration Guide - Pattern A with Safety & Instructions

## Updated Handler Signature

```python
def handle_telegram_callback_message(
    message_text: str,
    chat_id: str,
    from_user_id: str,
    message_id: int | None = None
) -> Dict
```

## Safety Checks (Built-In)

The handler automatically enforces:

1. ✅ **Sender verification**: Only accepts callbacks from John's Telegram ID (`8372254579`)
2. ✅ **Action validation**: Only accepts `ingest`, `view_json`, or `skip`
3. ✅ **Proposal exists**: Verifies proposal is in database
4. ✅ **Status check**: Proposal must be `pending` (not ingested/skipped)
5. ✅ **Expiration check**: Proposal must not be expired

If any check fails, returns instruction to send error message.

## Return Format: Instruction-Based

The handler returns **instructions** (not side effects):

**Single instruction:**
```python
{
    "kind": "send_message" | "send_file" | "edit_message",
    "chat_id": str,
    "text": str,  # If kind == "send_message"
    "file": {  # If kind == "send_file"
        "filename": str,
        "bytes": bytes
    },
    "edit": {  # If kind == "edit_message"
        "message_id": int,
        "chat_id": str,
        "new_text": str,
        "reply_markup": {"inline_keyboard": []}  # Optional: clear buttons
    },
    "error": Optional[str]  # If failed
}
```

**Multiple instructions (for ingest/skip - edit + receipt):**
```python
{
    "kind": "multiple",
    "chat_id": str,
    "instructions": [
        {
            "kind": "edit_message",
            "chat_id": str,
            "edit": {
                "message_id": int,
                "chat_id": str,
                "new_text": str,
                "reply_markup": {"inline_keyboard": []}
            }
        },
        {
            "kind": "send_message",
            "chat_id": str,
            "text": str
        }
    ]
}
```

## Integration Code

```python
import os
import sys
sys.path.append('/root/clawd/skills/course-proposal-manager')
from callback_handler import handle_telegram_callback_message

def handle_incoming_message(message):
    """Your Telegram message handler."""
    text = message.get("text", "")
    
    # Handle proposal callbacks
    if text.startswith("proposal:"):
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=str(message["chat"]["id"]),
            from_user_id=str(message.get("from", {}).get("id", "")),
            message_id=message.get("message_id")
        )
        
        # Execute the instruction(s)
        if result["kind"] == "multiple":
            # Handle multiple instructions (e.g., edit + receipt)
            for instruction in result["instructions"]:
                execute_instruction(instruction)
        else:
            execute_instruction(result)
        
        return  # Don't process as normal message


def execute_instruction(instruction: Dict):
    """Execute a single instruction."""
    if instruction["kind"] == "send_message":
        send_message(instruction["chat_id"], instruction["text"], parse_mode="Markdown")
    
    elif instruction["kind"] == "send_file":
        send_document(
            instruction["chat_id"],
            document=instruction["file"]["bytes"],
            filename=instruction["file"]["filename"]
        )
        # Optionally send accompanying text
        if instruction.get("text"):
            send_message(instruction["chat_id"], instruction["text"])
    
    elif instruction["kind"] == "edit_message":
        edit_params = {
            "chat_id": instruction["edit"]["chat_id"],
            "message_id": instruction["edit"]["message_id"],
            "text": instruction["edit"]["new_text"],
            "parse_mode": "Markdown"
        }
        # Include reply_markup if provided (to clear buttons)
        if "reply_markup" in instruction["edit"]:
            edit_params["reply_markup"] = instruction["edit"]["reply_markup"]
        
        edit_message_text(**edit_params)
    
    # ... handle other messages
```

## Storing Proposal Message ID

When creating a proposal and sending the message with buttons:

```python
from proposal_manager import create_proposal, update_proposal_message_id

# Create proposal
proposal_id = create_proposal(
    payload=course_json,
    agent_label="golf-course-research",
    run_id=operation_id
)

# Send Telegram message with buttons
message_result = send_message(
    chat_id=chat_id,
    text=format_proposal_message(proposal_id, course_json),
    reply_markup={"inline_keyboard": buttons}
)

# Store the message ID for later editing
if message_result and "message_id" in message_result:
    update_proposal_message_id(
        proposal_id,
        message_result["message_id"],
        str(chat_id)
    )
```

## Example Responses

**Ingest Success (with stored message_id - returns multiple instructions):**
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
                "new_text": "**Royal Scot Golf & Bowl** (Lansing, MI)\n...\n\n✅ **Ingested** at 09:14pm\nCourse ID: `course_royal_scot_lansing_mi`\nSnapshot: `abc-123`",
                "reply_markup": {"inline_keyboard": []}  # Clear buttons
            }
        },
        {
            "kind": "send_message",
            "chat_id": "123456789",
            "text": "✅ **Ingested** at 09:14pm\nCourse ID: `course_royal_scot_lansing_mi`\nSnapshot: `abc-123`"
        }
    ]
}
```

**Ingest Success (no stored message_id - receipt only):**
```python
{
    "kind": "send_message",
    "chat_id": "123456789",
    "text": "✅ **Ingested** at 09:14pm\nCourse ID: `course_royal_scot_lansing_mi`\nSnapshot: `abc-123`"
}
```

**View JSON:**
```python
{
    "kind": "send_file",
    "chat_id": "123456789",
    "file": {
        "filename": "course_royal_scot_lansing_mi.json",
        "bytes": b"{...json...}"
    },
    "text": "📄 JSON for Royal Scot Golf & Bowl"
}
```

**Skip (with stored message_id - returns multiple instructions):**
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
                "new_text": "**Royal Scot Golf & Bowl** (Lansing, MI)\n...\n\n⏭️ **Skipped**",
                "reply_markup": {"inline_keyboard": []}  # Clear buttons
            }
        },
        {
            "kind": "send_message",
            "chat_id": "123456789",
            "text": "⏭️ **Skipped**"
        }
    ]
}
```

**Error (Unauthorized):**
```python
{
    "kind": "send_message",
    "chat_id": "123456789",
    "text": "❌ Not authorized",
    "error": "Unauthorized user"
}
```

## Complete Example

```python
def on_telegram_message(message):
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        from callback_handler import handle_telegram_callback_message
        
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=str(message["chat"]["id"]),
            from_user_id=str(message.get("from", {}).get("id", "")),
            message_id=message.get("message_id")
        )
        
        # Execute instruction(s)
        if result["kind"] == "multiple":
            for instruction in result["instructions"]:
                execute_instruction(instruction)
        else:
            execute_instruction(result)
        
        return
    
    # Handle other messages...


def execute_instruction(instruction: Dict):
    """Execute a single instruction."""
    if instruction["kind"] == "send_message":
        send_message(instruction["chat_id"], instruction["text"], parse_mode="Markdown")
    
    elif instruction["kind"] == "send_file":
        send_document(
            instruction["chat_id"],
            document=instruction["file"]["bytes"],
            filename=instruction["file"]["filename"]
        )
        if instruction.get("text"):
            send_message(instruction["chat_id"], instruction["text"])
    
    elif instruction["kind"] == "edit_message":
        edit_params = {
            "chat_id": instruction["edit"]["chat_id"],
            "message_id": instruction["edit"]["message_id"],
            "text": instruction["edit"]["new_text"],
            "parse_mode": "Markdown"
        }
        # Include reply_markup if provided (to clear buttons)
        if "reply_markup" in instruction["edit"]:
            edit_params["reply_markup"] = instruction["edit"]["reply_markup"]
        
        edit_message_text(**edit_params)
```

## Idempotency

The handler includes built-in idempotency protection:

- **Payload hash**: Each proposal stores a SHA-256 hash of the normalized payload
- **Idempotency-Key header**: The ingest API receives `Idempotency-Key: <payload_hash>` header
- **Duplicate protection**: If the same payload is ingested twice, the API can detect and handle it idempotently

The handler is now safe, testable, idempotent, and returns clear instructions for your message pipeline to execute.
