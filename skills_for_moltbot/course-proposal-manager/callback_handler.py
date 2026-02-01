#!/usr/bin/env python3
"""
Telegram Callback Handler for Course Proposals

Handles inline button callbacks for course proposal actions.
Works with both message-based callbacks (callback_data as text) and true Telegram callbacks.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, Optional, List

# Add proposal manager to path
sys.path.append(os.path.dirname(__file__))
from proposal_manager import (
    ingest_proposal,
    skip_proposal,
    get_proposal,
    format_proposal_message
)


def parse_callback_data(callback_data: str) -> Optional[Dict[str, str]]:
    """
    Parse callback data in format: proposal:{action}:{proposal_id}
    
    Returns: {"action": "ingest|view_json|skip", "proposal_id": "..."} or None
    """
    if not callback_data or not callback_data.startswith("proposal:"):
        return None
    
    parts = callback_data.split(":", 2)
    if len(parts) != 3:
        return None
    
    prefix, action, proposal_id = parts
    if prefix != "proposal" or action not in ["ingest", "view_json", "skip"]:
        return None
    
    return {"action": action, "proposal_id": proposal_id}


def handle_proposal_callback(callback_data: str, message_context: Dict = None) -> Dict:
    """
    Handle a proposal callback and return response data (Pattern B - true Telegram callbacks).
    
    This is a legacy function for Pattern B. For Pattern A (message-based), use
    handle_telegram_callback_message() instead.
    
    Args:
        callback_data: The callback_data string (e.g., "proposal:ingest:RS-20260201-001")
        message_context: Optional context including message_id, chat_id, original_text
    
    Returns:
        Dict with instruction structure (same as handle_telegram_callback_message)
    """
    parsed = parse_callback_data(callback_data)
    if not parsed:
        return {
            "kind": "send_message",
            "chat_id": message_context.get("chat_id", "") if message_context else "",
            "text": "❌ Invalid callback format",
            "error": f"Invalid callback format: {callback_data}"
        }
    
    action = parsed["action"]
    proposal_id = parsed["proposal_id"]
    
    # Get proposal
    proposal = get_proposal(proposal_id)
    if not proposal:
        chat_id = message_context.get("chat_id", "") if message_context else ""
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": f"❌ Proposal {proposal_id} not found",
            "error": f"Proposal {proposal_id} not found"
        }
    
    chat_id = message_context.get("chat_id", "") if message_context else ""
    
    # Handle each action using the new action handlers
    if action == "ingest":
        return handle_ingest_action(proposal_id, proposal, chat_id)
    elif action == "view_json":
        return handle_view_json_action(proposal_id, proposal, chat_id)
    elif action == "skip":
        return handle_skip_action(proposal_id, proposal, chat_id)
    
    return {
        "kind": "send_message",
        "chat_id": chat_id,
        "text": f"❌ Unknown action: {action}",
        "error": f"Unknown action: {action}"
    }


def handle_ingest_action(proposal_id: str, proposal: Dict, chat_id: str) -> Dict:
    """Handle ingest action - returns instruction dict with both edit and receipt."""
    try:
        result = ingest_proposal(proposal_id)
        time_str = datetime.now().strftime("%I:%M%p")
        
        # Get original proposal message ID if stored
        proposal_message_id = proposal.get("proposal_message_id")
        proposal_chat_id = proposal.get("proposal_chat_id")
        
        # Format receipt message
        receipt_text = f"✅ **Ingested** at {time_str}\nCourse ID: `{result['course_id']}`\nSnapshot: `{result['snapshot_id']}`"
        
        # Format updated message text for edit
        original_text = format_proposal_message(proposal_id, proposal["payload"])
        updated_text = f"{original_text}\n\n✅ **Ingested** at {time_str}\nCourse ID: `{result['course_id']}`\nSnapshot: `{result['snapshot_id']}`"
        
        # Return BOTH edit (if possible) AND receipt message
        instructions = {
            "kind": "multiple",
            "chat_id": chat_id,
            "instructions": []
        }
        
        # Instruction 1: Edit original proposal message (if we have message ID)
        if proposal_message_id and proposal_chat_id == chat_id:
            instructions["instructions"].append({
                "kind": "edit_message",
                "chat_id": chat_id,
                "edit": {
                    "message_id": proposal_message_id,
                    "chat_id": chat_id,
                    "new_text": updated_text,
                    "reply_markup": {"inline_keyboard": []}  # Clear buttons
                }
            })
        
        # Instruction 2: Always send receipt message (audit trail)
        instructions["instructions"].append({
            "kind": "send_message",
            "chat_id": chat_id,
            "text": receipt_text
        })
        
        return instructions
        
    except Exception as e:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": f"❌ Failed to ingest: {str(e)}\n\nYou can try again by tapping Ingest.",
            "error": str(e)
        }


def handle_view_json_action(proposal_id: str, proposal: Dict, chat_id: str) -> Dict:
    """Handle view JSON action - returns instruction dict."""
    course_id = proposal["payload"]["course"]["id"]
    filename = f"{course_id}.json"
    json_content = json.dumps(proposal["payload"], indent=2)
    
    return {
        "kind": "send_file",
        "chat_id": chat_id,
        "file": {
            "filename": filename,
            "bytes": json_content.encode('utf-8')
        },
        "text": f"📄 JSON for {proposal['course_name']}"  # Optional accompanying message
    }


def handle_skip_action(proposal_id: str, proposal: Dict, chat_id: str) -> Dict:
    """Handle skip action - returns instruction dict with both edit and receipt."""
    skip_proposal(proposal_id)
    
    # Get original proposal message ID if stored
    proposal_message_id = proposal.get("proposal_message_id")
    proposal_chat_id = proposal.get("proposal_chat_id")
    
    # Format receipt message
    receipt_text = "⏭️ **Skipped**"
    
    # Format updated message text for edit
    original_text = format_proposal_message(proposal_id, proposal["payload"])
    updated_text = f"{original_text}\n\n⏭️ **Skipped**"
    
    # Return BOTH edit (if possible) AND receipt message
    instructions = {
        "kind": "multiple",
        "chat_id": chat_id,
        "instructions": []
    }
    
    # Instruction 1: Edit original proposal message (if we have message ID)
    if proposal_message_id and proposal_chat_id == chat_id:
        instructions["instructions"].append({
            "kind": "edit_message",
            "chat_id": chat_id,
            "edit": {
                "message_id": proposal_message_id,
                "chat_id": chat_id,
                "new_text": updated_text,
                "reply_markup": {"inline_keyboard": []}  # Clear buttons
            }
        })
    
    # Instruction 2: Always send receipt message (audit trail)
    instructions["instructions"].append({
        "kind": "send_message",
        "chat_id": chat_id,
        "text": receipt_text
    })
    
    return instructions




# Example integration functions (adapt to your Telegram library)

def handle_telegram_callback_message(
    message_text: str,
    chat_id: str,
    from_user_id: str,
    message_id: int | None = None
) -> Dict:
    """
    Handle callback when it comes as a regular message (callback_data as text).
    
    Use this if clicking a button sends a message like "proposal:ingest:RS-20260201-001"
    
    Args:
        message_text: The callback_data text (e.g., "proposal:ingest:RS-20260201-001")
        chat_id: Telegram chat ID
        from_user_id: Telegram user ID of the sender (for authorization)
        message_id: Current message ID (optional, for reference)
    
    Returns:
        Dict with instruction structure:
        {
            "kind": "send_message" | "send_file" | "edit_message",
            "chat_id": str,
            "text": str (if kind == "send_message"),
            "file": { "filename": str, "bytes": bytes } (if kind == "send_file"),
            "edit": { "message_id": int, "chat_id": str, "new_text": str } (if kind == "edit_message"),
            "error": Optional[str] (if failed)
        }
    """
    # Default allowed user IDs (John's Telegram ID)
    ALLOWED_USER_IDS = ["8372254579"]
    
    # Safety check 1: Verify sender
    if str(from_user_id) not in ALLOWED_USER_IDS:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": "❌ Not authorized",
            "error": "Unauthorized user"
        }
    
    # Safety check 2: Parse and verify action
    parsed = parse_callback_data(message_text)
    if not parsed:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": "❌ Invalid callback format",
            "error": f"Invalid callback format: {message_text}"
        }
    
    action = parsed["action"]
    proposal_id = parsed["proposal_id"]
    
    # Verify action is valid
    if action not in ["ingest", "view_json", "skip"]:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": f"❌ Unknown action: {action}",
            "error": f"Unknown action: {action}"
        }
    
    # Safety check 3: Verify proposal exists
    proposal = get_proposal(proposal_id)
    if not proposal:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": f"❌ Proposal {proposal_id} not found",
            "error": f"Proposal {proposal_id} not found"
        }
    
    # Safety check 4: Verify proposal is pending
    if proposal["status"] != "pending":
        if proposal["status"] == "ingested":
            return {
                "kind": "send_message",
                "chat_id": chat_id,
                "text": f"✅ Already ingested\nCourse ID: `{proposal.get('course_id', 'N/A')}`"
            }
        elif proposal["status"] == "skipped":
            return {
                "kind": "send_message",
                "chat_id": chat_id,
                "text": "⏭️ This proposal was already skipped"
            }
        else:
            return {
                "kind": "send_message",
                "chat_id": chat_id,
                "text": f"❌ Proposal status: {proposal['status']}",
                "error": f"Proposal status: {proposal['status']}"
            }
    
    # Safety check 5: Verify proposal not expired
    expires_at = datetime.fromisoformat(proposal["expires_at"])
    if datetime.now() > expires_at:
        return {
            "kind": "send_message",
            "chat_id": chat_id,
            "text": f"❌ Proposal {proposal_id} has expired",
            "error": "Proposal expired"
        }
    
    # Handle the action
    if action == "ingest":
        return handle_ingest_action(proposal_id, proposal, chat_id)
    elif action == "view_json":
        return handle_view_json_action(proposal_id, proposal, chat_id)
    elif action == "skip":
        return handle_skip_action(proposal_id, proposal, chat_id)
    
    # Should never reach here due to action validation above
    return {
        "kind": "send_message",
        "chat_id": chat_id,
        "text": f"❌ Unknown action: {action}",
        "error": f"Unknown action: {action}"
    }


def handle_telegram_callback_query(callback_query: Dict) -> Dict:
    """
    Handle true Telegram callback_query object.
    
    Use this if you receive a proper Telegram callback_query object with:
    - callback_query.data (the callback_data)
    - callback_query.message (original message)
    - callback_query.id (for answer_callback_query)
    """
    callback_data = callback_query.get("data", "")
    message = callback_query.get("message", {})
    
    result = handle_proposal_callback(callback_data, {
        "chat_id": message.get("chat", {}).get("id"),
        "message_id": message.get("message_id"),
        "original_text": message.get("text", ""),
        "callback_query_id": callback_query.get("id")
    })
    
    return result


# Example usage patterns

def example_message_based_handler(message: Dict):
    """
    Example: Handle callback when it arrives as a regular message.
    
    Message format: {"text": "proposal:ingest:RS-20260201-001", "chat": {...}, ...}
    """
    message_text = message.get("text", "")
    chat_id = str(message.get("chat", {}).get("id", ""))
    from_user_id = str(message.get("from", {}).get("id", ""))
    message_id = message.get("message_id")
    
    if message_text.startswith("proposal:"):
        result = handle_telegram_callback_message(
            message_text=message_text,
            chat_id=chat_id,
            from_user_id=from_user_id,
            message_id=message_id
        )
        
        # Execute instruction(s)
        if result["kind"] == "multiple":
            # Handle multiple instructions (e.g., edit + receipt)
            for instruction in result["instructions"]:
                execute_telegram_instruction(instruction)
        else:
            execute_telegram_instruction(result)


def execute_telegram_instruction(instruction: Dict):
    """Execute a single Telegram instruction."""
    if instruction["kind"] == "send_message":
        send_telegram_message(
            instruction["chat_id"],
            instruction["text"],
            parse_mode="Markdown"
        )
    
    elif instruction["kind"] == "send_file":
        send_telegram_document(
            instruction["chat_id"],
            document=instruction["file"]["bytes"],
            filename=instruction["file"]["filename"]
        )
        # Optionally send accompanying text
        if instruction.get("text"):
            send_telegram_message(instruction["chat_id"], instruction["text"])
    
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
        
        edit_telegram_message(**edit_params)


def example_callback_query_handler(callback_query: Dict):
    """
    Example: Handle true Telegram callback_query.
    
    Callback format: {
        "id": "123",
        "data": "proposal:ingest:RS-20260201-001",
        "message": {...}
    }
    """
    result = handle_telegram_callback_query(callback_query)
    
    callback_query_id = callback_query.get("id")
    chat_id = callback_query.get("message", {}).get("chat", {}).get("id")
    message_id = callback_query.get("message", {}).get("message_id")
    
    if result["success"]:
        # Answer callback query (removes loading state)
        answer_callback_query(callback_query_id, "Processing...")
        
        # Edit original message
        if result.get("edit_message") and message_id:
            edit_telegram_message(chat_id, message_id, **result["edit_message"])
        
        # Send file if needed
        if result.get("send_file"):
            send_telegram_document(chat_id, **result["send_file"])
    else:
        # Show error alert
        answer_callback_query(
            callback_query_id,
            result.get("error", "Unknown error"),
            show_alert=True
        )


# Placeholder functions - replace with your actual Telegram API calls
def send_telegram_message(chat_id: str, text: str, **kwargs):
    """Placeholder - replace with your Telegram send_message implementation."""
    pass

def edit_telegram_message(chat_id: str, message_id: int, text: str, reply_markup: Dict = None):
    """Placeholder - replace with your Telegram edit_message_text implementation."""
    pass

def send_telegram_document(chat_id: str, content: bytes, filename: str, content_type: str = "application/json"):
    """Placeholder - replace with your Telegram send_document implementation."""
    pass

def answer_callback_query(callback_query_id: str, text: str, show_alert: bool = False):
    """Placeholder - replace with your Telegram answer_callback_query implementation."""
    pass


if __name__ == "__main__":
    # Test parsing
    test_cases = [
        "proposal:ingest:RS-20260201-001",
        "proposal:view_json:RS-20260201-001",
        "proposal:skip:RS-20260201-001",
        "invalid:format",
        "proposal:unknown:RS-20260201-001"
    ]
    
    print("Testing callback parsing:")
    for test in test_cases:
        parsed = parse_callback_data(test)
        print(f"  {test} -> {parsed}")
