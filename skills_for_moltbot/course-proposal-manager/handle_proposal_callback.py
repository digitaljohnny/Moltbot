#!/usr/bin/env python3
"""
Handle Proposal Callback - Intercepts proposal: prefixed messages and routes them.

This script should be called when a Telegram message starts with "proposal:".
It handles the callback and executes Telegram instructions.
"""

import os
import sys
from pathlib import Path

# Add proposal manager to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from callback_handler import handle_telegram_callback_message

def execute_telegram_instruction(instruction, telegram_api=None):
    """
    Execute a Telegram instruction.
    
    Args:
        instruction: Instruction dict from callback handler
        telegram_api: Optional Telegram API object with methods:
            - send_message(chat_id, text, parse_mode=None, **kwargs)
            - send_document(chat_id, document, filename=None, **kwargs)
            - edit_message_text(chat_id, message_id, text, parse_mode=None, reply_markup=None, **kwargs)
    """
    if instruction["kind"] == "send_message":
        if telegram_api:
            telegram_api.send_message(
                instruction["chat_id"],
                instruction["text"],
                parse_mode="Markdown"
            )
        else:
            print(f"[TELEGRAM] Send message to {instruction['chat_id']}: {instruction['text'][:100]}...")
    
    elif instruction["kind"] == "send_file":
        if telegram_api:
            telegram_api.send_document(
                instruction["chat_id"],
                document=instruction["file"]["bytes"],
                filename=instruction["file"]["filename"]
            )
            if instruction.get("text"):
                telegram_api.send_message(instruction["chat_id"], instruction["text"])
        else:
            print(f"[TELEGRAM] Send file to {instruction['chat_id']}: {instruction['file']['filename']}")
    
    elif instruction["kind"] == "edit_message":
        edit = instruction["edit"]
        if telegram_api:
            edit_params = {
                "chat_id": edit["chat_id"],
                "message_id": edit["message_id"],
                "text": edit["new_text"],
                "parse_mode": "Markdown"
            }
            if "reply_markup" in edit:
                edit_params["reply_markup"] = edit["reply_markup"]
            telegram_api.edit_message_text(**edit_params)
        else:
            print(f"[TELEGRAM] Edit message {edit['message_id']} in chat {edit['chat_id']}")


def handle_proposal_message(message_text, chat_id, from_user_id, message_id=None, telegram_api=None):
    """
    Handle a proposal callback message.
    
    Args:
        message_text: The message text (e.g., "proposal:ingest:TO-20260201-001")
        chat_id: Telegram chat ID
        from_user_id: Telegram user ID of sender
        message_id: Optional message ID
        telegram_api: Optional Telegram API object for sending messages
    
    Returns:
        Dict with "handled" boolean indicating if message was processed
    """
    if not message_text.startswith("proposal:"):
        return {"handled": False}
    
    # Call the callback handler
    result = handle_telegram_callback_message(
        message_text=message_text,
        chat_id=str(chat_id),
        from_user_id=str(from_user_id),
        message_id=message_id
    )
    
    # Execute instructions
    if result["kind"] == "multiple":
        for instruction in result["instructions"]:
            execute_telegram_instruction(instruction, telegram_api)
    else:
        execute_telegram_instruction(result, telegram_api)
    
    return {"handled": True}


if __name__ == "__main__":
    # Test mode - can be called directly
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: handle_proposal_callback.py <message_text> <chat_id> <from_user_id> [message_id]")
        sys.exit(1)
    
    message_text = sys.argv[1]
    chat_id = sys.argv[2]
    from_user_id = sys.argv[3]
    message_id = int(sys.argv[4]) if len(sys.argv) > 4 else None
    
    result = handle_proposal_message(message_text, chat_id, from_user_id, message_id)
    print(f"Handled: {result['handled']}")
