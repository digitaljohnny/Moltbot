#!/usr/bin/env python3
"""
Example Integration: Message-Based Callback Handler

This shows exactly how to wire the proposal callback handler into your
message handler for Pattern A (message-based callbacks).
"""

import os
import sys
sys.path.append('/root/clawd/skills/course-proposal-manager')
from callback_handler import handle_telegram_callback_message


# Configuration
ALLOWED_USER_IDS = [
    # Add your Telegram user ID here
    # Get it by sending yourself a test message and checking message["from"]["id"]
    123456789  # Replace with your actual Telegram user ID
]


def handle_incoming_telegram_message(message):
    """
    Your existing Telegram message handler.
    
    Add this check at the top to handle proposal callbacks.
    """
    text = message.get("text", "")
    chat_id = message.get("chat", {}).get("id")
    message_id = message.get("message_id")
    user_id = message.get("from", {}).get("id")
    
    # Check if it's a proposal callback
    if text.startswith("proposal:"):
        # Handle the callback
        result = handle_telegram_callback_message(
            message_text=text,
            chat_id=chat_id,
            message_id=message_id,
            user_id=user_id,
            allowed_user_ids=ALLOWED_USER_IDS  # Optional safety check
        )
        
        # Send response based on result type
        if result["success"]:
            if result["response_type"] == "file":
                # Send JSON file
                send_telegram_document(
                    chat_id=chat_id,
                    document=result["send_file"]["content"],
                    filename=result["send_file"]["filename"]
                )
                # Also send confirmation message
                send_telegram_message(chat_id, result["response_text"])
            else:
                # Send response message
                send_telegram_message(
                    chat_id,
                    result["response_text"],
                    parse_mode="Markdown"
                )
        else:
            # Send error message
            send_telegram_message(chat_id, result["response_text"])
        
        return  # Don't process as normal message
    
    # ... rest of your normal message handling
    # (process other messages as usual)


# Minimal version (if you want the absolute simplest)
def handle_incoming_telegram_message_minimal(message):
    """Minimal integration - just the essentials."""
    text = message.get("text", "")
    
    if text.startswith("proposal:"):
        from callback_handler import handle_telegram_callback_message
        
        result = handle_telegram_callback_message(
            text,
            message["chat"]["id"],
            message.get("message_id"),
            message.get("from", {}).get("id")
        )
        
        # Send response
        send_telegram_message(message["chat"]["id"], result["response_text"])
        
        # Send file if viewing JSON
        if result.get("send_file"):
            send_telegram_document(
                message["chat"]["id"],
                document=result["send_file"]["content"],
                filename=result["send_file"]["filename"]
            )
        
        return


# Placeholder functions - replace with your actual Telegram API calls
def send_telegram_message(chat_id: int, text: str, parse_mode: str = None):
    """Send a Telegram message. Replace with your implementation."""
    # Example: requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", ...)
    pass

def send_telegram_document(chat_id: int, document: bytes, filename: str):
    """Send a Telegram document. Replace with your implementation."""
    # Example: requests.post(f"https://api.telegram.org/bot{TOKEN}/sendDocument", ...)
    pass
