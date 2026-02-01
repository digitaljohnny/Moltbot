# Routing Integration Guide

## Where to Add Proposal Callback Routing

Since Clawdbot's Telegram message handling is in the binary (not in this repo), you need to add the routing in one of these locations:

### Option 1: Agent-Level Message Preprocessing (Recommended)

If your agent processes messages before sending to the LLM, add the routing there:

**Location:** Wherever your agent receives Telegram messages (likely in agent code or a message preprocessing hook)

**Code to add:**

```python
import os
import sys
from pathlib import Path

# Add proposal manager to path (adjust path to match your container)
proposal_manager_path = Path("/root/clawd/skills_for_moltbot/course-proposal-manager")
if proposal_manager_path.exists():
    sys.path.insert(0, str(proposal_manager_path))
    from callback_handler import handle_telegram_callback_message

def preprocess_message(message):
    """Preprocess incoming Telegram messages before agent handles them."""
    text = message.get("text", "")
    
    # Handle proposal callbacks - intercept before LLM
    if text.startswith("proposal:"):
        chat_id = str(message.get("chat", {}).get("id", ""))
        from_user_id = str(message.get("from", {}).get("id", ""))
        message_id = message.get("message_id")
        
        # Call handler
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            from_user_id=from_user_id,
            message_id=message_id
        )
        
        # Execute instructions
        if result["kind"] == "multiple":
            for instruction in result["instructions"]:
                execute_telegram_instruction(instruction)
        else:
            execute_telegram_instruction(result)
        
        # Return True to indicate message was handled (don't send to LLM)
        return True
    
    # Return False to continue normal processing
    return False


def execute_telegram_instruction(instruction):
    """Execute a Telegram instruction."""
    # You'll need to replace these with your actual Telegram API calls
    if instruction["kind"] == "send_message":
        # send_telegram_message(instruction["chat_id"], instruction["text"], parse_mode="Markdown")
        pass
    
    elif instruction["kind"] == "send_file":
        # send_telegram_document(
        #     instruction["chat_id"],
        #     document=instruction["file"]["bytes"],
        #     filename=instruction["file"]["filename"]
        # )
        pass
    
    elif instruction["kind"] == "edit_message":
        edit = instruction["edit"]
        # edit_telegram_message_text(
        #     chat_id=edit["chat_id"],
        #     message_id=edit["message_id"],
        #     text=edit["new_text"],
        #     parse_mode="Markdown",
        #     reply_markup=edit.get("reply_markup")
        # )
        pass
```

### Option 2: Hook System (If Available)

If Clawdbot supports message-received hooks, register a hook:

**Location:** Hook registration (check Clawdbot hook documentation)

**Code:**

```python
def message_received_hook(message):
    """Hook called when a message is received."""
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        # Handle proposal callback
        # ... same as Option 1 ...
        return {"handled": True}  # Prevent further processing
    
    return {"handled": False}  # Continue normal processing
```

### Option 3: Skill-Based Routing

Create a skill that intercepts `proposal:` messages:

**Location:** New skill or modify existing message routing skill

**SKILL.md:**

```markdown
# Proposal Callback Router

Intercepts `proposal:` prefixed messages and routes them to the proposal callback handler.

## Usage

Automatically handles messages starting with `proposal:`.
```

## Finding Your Message Handler

To locate where to add this code:

1. **Check Clawdbot logs:**
   ```bash
   docker logs moltbot-setup | grep -i "message\|telegram" | tail -20
   ```

2. **Check for Python files in workspace:**
   ```bash
   docker exec moltbot-setup find /root/clawd -name "*.py" -exec grep -l "message\|telegram" {} \;
   ```

3. **Check agent code:**
   - Look for where messages are processed before being sent to the LLM
   - Check for message preprocessing functions
   - Look for hook registration code

## Testing the Integration

Once you've added the routing:

1. **Test manually:**
   - Send message: `proposal:view_json:TO-20260201-001`
   - Should receive JSON file or "proposal not found"

2. **Test with button:**
   - Click "View JSON" button
   - Should receive JSON file

3. **Test ingest:**
   - Click "Ingest" button
   - Should see card update + receipt message

## Next Steps

**Please provide:**
1. The file path where you want to add the routing
2. The function signature that receives Telegram messages
3. How to send Telegram messages in your system (function names/API)

Then I can provide the exact integration code tailored to your setup.
