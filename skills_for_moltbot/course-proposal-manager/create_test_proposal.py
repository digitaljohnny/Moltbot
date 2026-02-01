#!/usr/bin/env python3
"""
Create a test proposal for testing callback routing.

This creates a minimal proposal in the database so you can test
the proposal:view_json:<ID> routing without running full golf-course-research.
"""

import sys
import os
from pathlib import Path

# Add proposal manager to path
proposal_path = Path("/home/node/clawd/skills_for_moltbot/course-proposal-manager")
sys.path.insert(0, str(proposal_path))

from proposal_manager import create_proposal

# Minimal test course JSON
test_course_json = {
    "course": {
        "id": "course_test_course",
        "name": "Test Golf Course",
        "city": "Test City",
        "state": "MI",
        "address": "123 Test St",
        "phone": "(555) 123-4567",
        "domain": "testcourse.com",
        "geoLat": 42.7,
        "geoLng": -84.4
    },
    "courseTypes": [
        {"groupKey": "hole_count", "typeKey": "18"},
        {"groupKey": "access", "typeKey": "public"}
    ],
    "teeSets": [],
    "holes": [],
    "amenities": []
}

if __name__ == "__main__":
    print("Creating test proposal...")
    
    proposal_id = create_proposal(
        payload=test_course_json,
        agent_label="test",
        run_id="test-run-001",
        expires_hours=48
    )
    
    print(f"\n✅ Test proposal created!")
    print(f"   Proposal ID: {proposal_id}")
    print(f"\n📝 To test routing, send this message in Telegram:")
    print(f"   proposal:view_json:{proposal_id}")
    print(f"\nExpected: JSON file attachment or error message")
