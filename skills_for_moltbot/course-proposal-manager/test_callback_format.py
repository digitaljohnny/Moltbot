#!/usr/bin/env python3
"""
Test script to determine Telegram callback format in Moltbot/Clawdbot.

This script helps you test what format callbacks arrive in when you click inline buttons.
"""

import json
import sys

def print_test_instructions():
    """Print instructions for testing callback format."""
    print("=" * 60)
    print("TELEGRAM CALLBACK FORMAT TEST")
    print("=" * 60)
    print()
    print("STEP 1: Send a test message with inline buttons")
    print("-" * 60)
    print()
    print("Send this message to your Telegram bot:")
    print()
    print('  "Send me a test button"')
    print()
    print("Or manually create a message with:")
    print()
    print("  Text: 'Test button'")
    print("  Inline keyboard:")
    print("    [{'text': 'Test', 'callback_data': 'test:123'}]")
    print()
    print("STEP 2: Click the button once")
    print("-" * 60)
    print()
    print("Click the 'Test' button in Telegram.")
    print()
    print("STEP 3: Check what arrives")
    print("-" * 60)
    print()
    print("Check ONE of the following:")
    print()
    print("OPTION A - Message-Based Callback:")
    print("  ✓ A NEW MESSAGE appears in the chat")
    print("  ✓ The message text is exactly: 'test:123'")
    print("  ✓ No special callback_query object")
    print()
    print("OPTION B - True Callback Query:")
    print("  ✓ NO new message text appears")
    print("  ✓ Check Moltbot logs or event payload")
    print("  ✓ Look for: callback_query.data = 'test:123'")
    print("  ✓ Or: update.callback_query.data = 'test:123'")
    print()
    print("STEP 4: Report the format")
    print("-" * 60)
    print()
    print("Paste one of:")
    print("  A) The exact message text that appeared")
    print("  B) The log/event snippet showing callback_query")
    print()
    print("=" * 60)


def analyze_callback_format(user_input):
    """Analyze user's input to determine callback format."""
    input_lower = user_input.lower()
    
    if "test:123" in input_lower or "callback_data" in input_lower:
        if "callback_query" in input_lower or "update" in input_lower:
            print("\n✅ FORMAT DETECTED: True Callback Query")
            print("\nUse: handle_telegram_callback_query()")
            print("\nExample integration:")
            print("""
def on_callback_query(callback_query):
    if callback_query.get("data", "").startswith("proposal:"):
        result = handle_telegram_callback_query(callback_query)
        # Handle result...
            """)
        else:
            print("\n✅ FORMAT DETECTED: Message-Based Callback")
            print("\nUse: handle_telegram_callback_message()")
            print("\nExample integration:")
            print("""
def on_message(message):
    text = message.get("text", "")
    if text.startswith("proposal:"):
        result = handle_telegram_callback_message(text, message["chat"]["id"])
        # Handle result...
            """)
    else:
        print("\n⚠️  Could not determine format from input.")
        print("\nPlease provide:")
        print("  - The exact message text that appeared, OR")
        print("  - A log snippet showing callback_query structure")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Analyze provided input
        user_input = " ".join(sys.argv[1:])
        analyze_callback_format(user_input)
    else:
        # Print test instructions
        print_test_instructions()
        print()
        print("After testing, run:")
        print("  python3 test_callback_format.py '<paste what you saw>'")
        print()
        print("Or paste the result here and I'll analyze it.")
