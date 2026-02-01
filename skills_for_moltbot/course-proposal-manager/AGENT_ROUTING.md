# Agent-Level Proposal Callback Routing

## Overview

In Moltbot, Telegram messages arrive as regular messages to the agent. When a user clicks an inline button, the callback_data appears as plain text (e.g., `proposal:ingest:TO-20260201-001`).

**You must intercept these messages at the agent level** before they reach the LLM.

## Integration Pattern

### Step 1: Intercept Proposal Messages

When processing incoming Telegram messages, **always check first** if the message starts with `proposal:`:

```python
def handle_incoming_message(message_data):
    """
    Process incoming Telegram message.
    
    Args:
        message_data: Dict with keys like 'text', 'chat', 'from', 'message_id'
    """
    text = message_data.get("text", "").strip()
    
    # CRITICAL: Intercept proposal callbacks BEFORE LLM processing
    if text.startswith("proposal:"):
        return handle_proposal_callback_routing(message_data)
    
    # Continue normal message processing...
    # (send to LLM, etc.)
```

### Step 2: Route to Handler

```python
import os
import sys
import tempfile
from pathlib import Path

def handle_proposal_callback_routing(message_data):
    """
    Route proposal callbacks to the handler and execute instructions.
    
    Returns:
        Dict with 'handled': True to stop normal processing
    """
    # Add proposal manager to Python path
    proposal_path = Path("/home/node/clawd/skills_for_moltbot/course-proposal-manager")
    if not proposal_path.exists():
        return {"handled": False, "error": "Proposal manager not found"}
    
    sys.path.insert(0, str(proposal_path))
    from callback_handler import handle_telegram_callback_message
    
    # Extract message context
    text = message_data.get("text", "")
    chat_id = str(message_data.get("chat", {}).get("id", ""))
    from_user_id = str(message_data.get("from", {}).get("id", ""))
    message_id = message_data.get("message_id")
    
    # Call handler
    try:
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            from_user_id=from_user_id,
            message_id=message_id
        )
        
        # Execute instructions using Moltbot's message tool
        execute_instructions(result)
        
        return {"handled": True}
        
    except Exception as e:
        # Log error but don't crash
        print(f"[PROPOSAL] Error handling callback: {e}")
        return {"handled": True, "error": str(e)}
```

### Step 3: Execute Instructions Using Moltbot's Message Tool

```python
def execute_instructions(instruction_result):
    """
    Execute Telegram instructions using Moltbot's message tool.
    
    Args:
        instruction_result: Dict from handle_telegram_callback_message()
    """
    if instruction_result.get("kind") == "multiple":
        # Execute each instruction in order
        for instruction in instruction_result.get("instructions", []):
            execute_single_instruction(instruction)
    else:
        execute_single_instruction(instruction_result)


def execute_single_instruction(instruction):
    """
    Execute a single Telegram instruction using Moltbot's message tool.
    
    Instruction formats:
    - {"kind": "send_message", "chat_id": "...", "text": "..."}
    - {"kind": "send_file", "chat_id": "...", "file": {"filename": "...", "bytes": b"..."}, "text": "..."}
    - {"kind": "edit_message", "chat_id": "...", "edit": {"message_id": 123, "new_text": "...", "reply_markup": {...}}}
    """
    kind = instruction.get("kind")
    chat_id = instruction.get("chat_id")
    
    if kind == "send_message":
        # Use Moltbot's message tool to send text
        message(
            action="send",
            channel="telegram",
            target=chat_id,
            message=instruction.get("text", ""),
            parse_mode="Markdown"  # Handler uses Markdown formatting
        )
    
    elif kind == "send_file":
        # Create temporary file for JSON document
        file_data = instruction.get("file", {})
        filename = file_data.get("filename", "course.json")
        file_bytes = file_data.get("bytes", b"")
        
        # Write to temp file (Moltbot message tool expects a path)
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.json') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            # Send file via Moltbot's message tool
            message(
                action="send",
                channel="telegram",
                target=chat_id,
                path=tmp_path,
                filename=filename
            )
            
            # Optionally send accompanying text message
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
        edit_data = instruction.get("edit", {})
        message_id = edit_data.get("message_id")
        new_text = edit_data.get("new_text", "")
        reply_markup = edit_data.get("reply_markup")  # Used to clear buttons
        
        # Use Moltbot's message tool to edit message
        message(
            action="edit",
            channel="telegram",
            target=chat_id,
            messageId=message_id,
            message=new_text,
            parse_mode="Markdown",
            reply_markup=reply_markup  # Pass through to clear buttons
        )
    
    else:
        print(f"[PROPOSAL] Unknown instruction kind: {kind}")
```

## Complete Example Integration

Here's a complete example showing how to integrate this into your agent's message handling:

```python
#!/usr/bin/env python3
"""
Agent-level proposal callback routing for Moltbot.

Add this to your agent's message preprocessing logic.
"""

import os
import sys
import tempfile
from pathlib import Path


def route_proposal_callbacks(message_data):
    """
    Main entry point: Check if message is a proposal callback and handle it.
    
    Call this BEFORE sending messages to the LLM.
    
    Returns:
        Dict with 'handled': bool - if True, do NOT send to LLM
    """
    text = message_data.get("text", "").strip()
    
    if not text.startswith("proposal:"):
        return {"handled": False}
    
    # Import handler
    proposal_path = Path("/home/node/clawd/skills_for_moltbot/course-proposal-manager")
    if not proposal_path.exists():
        print(f"[PROPOSAL] Warning: Proposal manager not found at {proposal_path}")
        return {"handled": False}
    
    sys.path.insert(0, str(proposal_path))
    try:
        from callback_handler import handle_telegram_callback_message
    except ImportError as e:
        print(f"[PROPOSAL] Failed to import handler: {e}")
        return {"handled": False}
    
    # Extract context
    chat_id = str(message_data.get("chat", {}).get("id", ""))
    from_user_id = str(message_data.get("from", {}).get("id", ""))
    message_id = message_data.get("message_id")
    
    # Handle callback
    try:
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            from_user_id=from_user_id,
            message_id=message_id
        )
        
        # Execute instructions
        execute_instructions(result)
        
        return {"handled": True}
        
    except Exception as e:
        print(f"[PROPOSAL] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"handled": True, "error": str(e)}


def execute_instructions(instruction_result):
    """Execute instructions returned by the handler."""
    if instruction_result.get("kind") == "multiple":
        for instruction in instruction_result.get("instructions", []):
            execute_single_instruction(instruction)
    else:
        execute_single_instruction(instruction_result)


def execute_single_instruction(instruction):
    """Execute a single instruction using Moltbot's message tool."""
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


# Usage in your agent:
#
# def handle_telegram_message(message_data):
#     # Intercept proposal callbacks FIRST
#     proposal_result = route_proposal_callbacks(message_data)
#     if proposal_result.get("handled"):
#         return  # Don't send to LLM
#     
#     # Normal message processing...
#     # (send to LLM, etc.)
```

## Testing

1. **Manual test**: Send `proposal:view_json:TO-20260201-001` as a message
2. **Expected**: Receive JSON file or "proposal not found" message
3. **Button test**: Click "Ingest" on a proposal card
4. **Expected**: 
   - Original card updates with status
   - Buttons cleared
   - Receipt message sent

## Important Notes

- **Always check `proposal:` prefix FIRST** - before any LLM processing
- **DB location**: `/home/node/clawd/data/course_proposals.db` (inside container)
- **Handler path**: `/home/node/clawd/skills_for_moltbot/course-proposal-manager/callback_handler.py`
- **Message tool**: Use Moltbot's built-in `message()` tool (not direct Telegram API)
- **Temp files**: Clean up temp files after sending documents
- **Error handling**: Log errors but don't crash - return `{"handled": True}` even on errors

## Troubleshooting

**"Proposal manager not found"**
- Check that `/home/node/clawd/skills_for_moltbot/course-proposal-manager/` exists in container
- Verify `callback_handler.py` is present

**"No module named 'proposal_manager'"**
- Ensure `sys.path.insert(0, str(proposal_path))` runs before import
- Check that `proposal_manager.py` exists in the directory

**"proposal not found"**
- Verify DB path: `/home/node/clawd/data/course_proposals.db`
- Check that proposal was created successfully
- Ensure DB file is readable/writable

**Messages not executing**
- Verify `message()` tool is available in your agent context
- Check that `chat_id` is correct (string format)
- Ensure `messageId` is integer (not string) for edit actions
