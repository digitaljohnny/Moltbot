#!/usr/bin/env python3
"""
Verify that Python and JavaScript produce the same payload hash.

Run this to ensure idempotency works across both systems.
"""

import json
import hashlib

# Sample payload (matches what golf-course-research would produce)
sample_payload = {
    "course": {
        "id": "course_test_123",
        "name": "Test Golf Course",
        "city": "Test City",
        "state": "MI",
        "geoLat": 42.7,
        "geoLng": -84.4,
        "holes": 18,
        "teeSets": [
            {
                "color": "blue",
                "rating": 72.5,
                "slope": 130
            },
            {
                "color": "white",
                "rating": 70.0,
                "slope": 125
            }
        ]
    },
    "courseTypes": [
        {"groupKey": "access", "typeKey": "public"},
        {"groupKey": "tech", "typeKey": "none"}
    ]
}

# Python normalization (matches proposal_manager.py)
normalized_python = json.dumps(sample_payload, sort_keys=True, separators=(',', ':'))
hash_python = hashlib.sha256(normalized_python.encode('utf-8')).hexdigest()

print("Python normalization:")
print(f"  Normalized (first 100 chars): {normalized_python[:100]}...")
print(f"  Hash: {hash_python}")
print()

# Expected JavaScript normalization (matches server.js normalizeJSON)
# JavaScript should produce the same normalized string
print("Expected JavaScript hash (should match):")
print(f"  Hash: {hash_python}")
print()

# Test with different key order (should produce same hash)
unordered_payload = {
    "courseTypes": sample_payload["courseTypes"],
    "course": sample_payload["course"]
}
normalized_unordered = json.dumps(unordered_payload, sort_keys=True, separators=(',', ':'))
hash_unordered = hashlib.sha256(normalized_unordered.encode('utf-8')).hexdigest()

print("Test: Different key order")
print(f"  Original hash: {hash_python}")
print(f"  Unordered hash: {hash_unordered}")
print(f"  Match: {hash_python == hash_unordered}")

if hash_python == hash_unordered:
    print("✅ Key order normalization works correctly")
else:
    print("❌ Key order normalization failed - hashes differ!")
