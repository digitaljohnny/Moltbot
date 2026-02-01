#!/usr/bin/env python3
"""
Message Hook: Intercepts proposal: prefixed messages and handles them.

This hook should be registered with Clawdbot to intercept messages before they reach the agent.
"""

import os
import sys
from pathlib import Path

# Add proposal manager to path
hook_dir = Path(__file__).parent
sys.path.insert(0, str(hook_dir))

from callback_handler import handle_telegram_callback_message


def message_received_hook(message):
    """
    Hook function called when a Telegram message is received.
    
    This intercepts messages starting with "proposal:" and handles them
    before they reach the agent/LLM.
    
    Args:
        message: Telegram message dict with:
            - text: Message text
            - chat: {id: chat_id}
            - from: {id: user_id}
            - message_id: Message ID
    
    Returns:
        Dict with:
            - handled: bool - True if message was handled, False to continue processing
            - response: Optional dict with Telegram API calls to make
    """
    text = message.get("text", "")
    
    # Only handle proposal: prefixed messages
    if not text.startswith("proposal:"):
        return {"handled": False}
    
    # Extract message details
    chat_id = str(message.get("chat", {}).get("id", ""))
    from_user_id = str(message.get("from", {}).get("id", ""))
    message_id = message.get("message_id")
    
    # Handle the callback
    result = handle_telegram_callback_message(
        message_text=text,
        chat_id=chat_id,
        from_user_id=from_user_id,
        message_id=message_id
    )
    
    # Return instructions for Telegram API
    return {
        "handled": True,
        "instructions": result if result["kind"] == "multiple" else [result]
    }


# For testing
if __name__ == "__main__":
    test_message = {
        "text": "proposal:view_json:TO-20260201-001",
        "chat": {"id": "123456789"},
        "from": {"id": "8372254579"},
        "message_id": 42
    }
    
    result = message_received_hook(test_message)
    print(f"Handled: {result['handled']}")
    if result.get("instructions"):
        print(f"Instructions: {len(result['instructions'])}")
        for inst in result["instructions"]:
            print(f"  - {inst['kind']}")
