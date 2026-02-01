#!/usr/bin/env python3
"""
Test script for proposal flow - simulates Telegram callback handling.

Run this to test the proposal callback handler end-to-end.
"""

import sys
import os
import json
from pathlib import Path

# Add proposal manager to path
sys.path.insert(0, str(Path(__file__).parent))

from proposal_manager import (
    create_proposal,
    format_proposal_message,
    get_proposal,
    update_proposal_message_id
)
from callback_handler import handle_telegram_callback_message

# Load test payload (Royal Scot)
royal_scot_path = Path(__file__).parent.parent.parent / "moltbot-courses" / "royal_scot.json"
if not royal_scot_path.exists():
    print(f"Error: {royal_scot_path} not found")
    sys.exit(1)

with open(royal_scot_path, 'r') as f:
    payload = json.load(f)

print("=" * 60)
print("PROPOSAL FLOW TEST")
print("=" * 60)

# Step 1: Create proposal
print("\n1. Creating proposal...")
proposal_id = create_proposal(
    payload=payload,
    agent_label="test-manual",
    run_id="test-001"
)
print(f"   ✅ Created proposal: {proposal_id}")

# Step 2: Format proposal message
print("\n2. Formatting proposal message...")
message_text = format_proposal_message(proposal_id, payload)
print(f"   Message preview (first 200 chars):\n   {message_text[:200]}...")

# Step 3: Simulate callback - First Ingest
print("\n3. Simulating first 'Ingest' callback...")
print(f"   Callback: proposal:ingest:{proposal_id}")

chat_id = "123456789"  # Test chat ID
from_user_id = "8372254579"  # John's Telegram ID (authorized)

result1 = handle_telegram_callback_message(
    message_text=f"proposal:ingest:{proposal_id}",
    chat_id=chat_id,
    from_user_id=from_user_id,
    message_id=42  # Simulated message ID
)

print(f"   Result kind: {result1['kind']}")
if result1['kind'] == 'multiple':
    print(f"   Instructions: {len(result1['instructions'])}")
    for i, inst in enumerate(result1['instructions'], 1):
        print(f"     {i}. {inst['kind']}")
        if inst['kind'] == 'send_message':
            print(f"        Text: {inst['text'][:100]}...")
        elif inst['kind'] == 'edit_message':
            print(f"        Edit message_id: {inst['edit']['message_id']}")
            print(f"        New text preview: {inst['edit']['new_text'][:100]}...")
else:
    print(f"   Response: {result1.get('text', 'N/A')[:100]}...")

# Step 4: Verify proposal status
print("\n4. Verifying proposal status...")
proposal = get_proposal(proposal_id)
print(f"   Status: {proposal['status']}")
print(f"   Course ID: {proposal.get('course_id', 'N/A')}")
print(f"   Snapshot ID: {proposal.get('snapshot_id', 'N/A')}")

# Step 5: Simulate callback - Second Ingest (should be idempotent)
print("\n5. Simulating second 'Ingest' callback (idempotency test)...")
print(f"   Callback: proposal:ingest:{proposal_id}")

result2 = handle_telegram_callback_message(
    message_text=f"proposal:ingest:{proposal_id}",
    chat_id=chat_id,
    from_user_id=from_user_id,
    message_id=42
)

print(f"   Result kind: {result2['kind']}")
if result2['kind'] == 'send_message':
    print(f"   Response: {result2['text']}")
else:
    print(f"   Unexpected result type: {result2}")

# Step 6: Test View JSON
print("\n6. Simulating 'View JSON' callback...")
print(f"   Callback: proposal:view_json:{proposal_id}")

result3 = handle_telegram_callback_message(
    message_text=f"proposal:view_json:{proposal_id}",
    chat_id=chat_id,
    from_user_id=from_user_id,
    message_id=42
)

print(f"   Result kind: {result3['kind']}")
if result3['kind'] == 'send_file':
    print(f"   File: {result3['file']['filename']}")
    print(f"   Size: {len(result3['file']['bytes'])} bytes")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
print(f"\nProposal ID for manual Telegram test: {proposal_id}")
print(f"\nCallback examples:")
print(f"  Ingest: proposal:ingest:{proposal_id}")
print(f"  View JSON: proposal:view_json:{proposal_id}")
print(f"  Skip: proposal:skip:{proposal_id}")
