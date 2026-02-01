# Hook Integration Guide

## Registering the Message Hook

Since Clawdbot's Telegram handler is in the binary, you need to register a hook to intercept `proposal:` messages.

## Option 1: Register as Clawdbot Hook

If Clawdbot supports custom hooks, register this hook:

**Hook File:** `/root/clawd/skills_for_moltbot/course-proposal-manager/message_hook.py`

**Hook Function:** `message_received_hook(message) -> dict`

**Registration (check Clawdbot hook docs):**
```bash
# In clawdbot.json or via CLI
clawdbot hooks register message-received /root/clawd/skills_for_moltbot/course-proposal-manager/message_hook.py
```

## Option 2: Agent-Level Interception

If hooks aren't available, the agent should check for `proposal:` prefix:

**In agent message processing:**
```python
def process_message(message):
    text = message.get("text", "")
    
    # Intercept proposal callbacks
    if text.startswith("proposal:"):
        from skills_for_moltbot.course_proposal_manager.message_hook import message_received_hook
        result = message_received_hook(message)
        
        if result["handled"]:
            # Execute Telegram instructions
            for instruction in result.get("instructions", []):
                execute_telegram_instruction(instruction)
            return  # Don't process as normal message
    
    # Continue normal processing...
```

## Testing the Hook

**Test manually:**
```python
from message_hook import message_received_hook

test_msg = {
    "text": "proposal:view_json:TO-20260201-001",
    "chat": {"id": "123456789"},
    "from": {"id": "8372254579"},
    "message_id": 42
}

result = message_received_hook(test_msg)
print(result)
```

**Expected output:**
```python
{
    "handled": True,
    "instructions": [
        {
            "kind": "send_file",
            "chat_id": "123456789",
            "file": {"filename": "...", "bytes": b"..."}
        }
    ]
}
```

## Next Steps

1. **Find hook registration method** - Check Clawdbot docs for hook registration
2. **Or add agent-level check** - Update agent to check `proposal:` prefix
3. **Implement Telegram API calls** - Replace placeholder functions with actual API calls
4. **Test end-to-end** - Click button → verify callback handled

## Current Status

✅ Hook function created (`message_hook.py`)  
✅ Callback handler ready  
⏳ **Waiting for:** Hook registration method or agent message preprocessing location
