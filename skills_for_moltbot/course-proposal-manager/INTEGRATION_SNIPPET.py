#!/usr/bin/env python3
"""
Ready-to-use integration snippet for proposal callback routing.

Paste this into your agent's message preprocessing/handler code.
"""

import os
import sys
import tempfile
from pathlib import Path


def route_proposal_callbacks(message_data):
    """
    Intercept and handle proposal:* messages before they reach the LLM.
    
    Call this FIRST in your message handler, before any LLM processing.
    
    Args:
        message_data: Dict with Telegram message structure:
            - text: str - Message text
            - chat: dict - {id: chat_id}
            - from: dict - {id: user_id}
            - message_id: int - Message ID
    
    Returns:
        Dict with 'handled': bool
        - If True: message was handled, do NOT send to LLM
        - If False: continue normal processing
    """
    text = message_data.get("text", "").strip()
    
    # Only handle proposal: prefixed messages
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
    
    # Extract message context
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
        
        # Execute instructions using Moltbot's message tool
        execute_instructions(result)
        
        return {"handled": True}
        
    except Exception as e:
        print(f"[PROPOSAL] Error handling callback: {e}")
        import traceback
        traceback.print_exc()
        return {"handled": True, "error": str(e)}


def execute_instructions(instruction_result):
    """Execute Telegram instructions using Moltbot's message tool."""
    if instruction_result.get("kind") == "multiple":
        for instruction in instruction_result.get("instructions", []):
            execute_single_instruction(instruction)
    else:
        execute_single_instruction(instruction_result)


def execute_single_instruction(instruction):
    """
    Execute a single Telegram instruction using Moltbot's message tool.
    
    Uses Moltbot's built-in message() tool with these actions:
    - action="send" for messages and files
    - action="edit" for editing messages
    """
    kind = instruction.get("kind")
    chat_id = instruction.get("chat_id")
    
    if kind == "send_message":
        # Send text message
        message(
            action="send",
            channel="telegram",
            target=chat_id,
            message=instruction.get("text", ""),
            parse_mode="Markdown"
        )
    
    elif kind == "send_file":
        # Send JSON file
        file_data = instruction.get("file", {})
        filename = file_data.get("filename", "course.json")
        file_bytes = file_data.get("bytes", b"")
        
        # Write to temp file (message tool expects a path)
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.json') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            # Send file
            message(
                action="send",
                channel="telegram",
                target=chat_id,
                path=tmp_path,
                filename=filename
            )
            
            # Optionally send accompanying text
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
        # Edit existing message (to update proposal card and clear buttons)
        edit_data = instruction.get("edit", {})
        message(
            action="edit",
            channel="telegram",
            target=chat_id,
            messageId=edit_data.get("message_id"),
            message=edit_data.get("new_text", ""),
            parse_mode="Markdown",
            reply_markup=edit_data.get("reply_markup")  # Clears buttons if provided
        )
    
    else:
        print(f"[PROPOSAL] Unknown instruction kind: {kind}")


# ============================================================================
# USAGE: Add this to your agent's message handler
# ============================================================================
#
# def handle_incoming_message(message_data):
#     """Your existing message handler."""
#     
#     # STEP 1: Intercept proposal callbacks FIRST
#     proposal_result = route_proposal_callbacks(message_data)
#     if proposal_result.get("handled"):
#         return  # Don't send to LLM
#     
#     # STEP 2: Continue normal message processing...
#     # (send to LLM, etc.)
#
