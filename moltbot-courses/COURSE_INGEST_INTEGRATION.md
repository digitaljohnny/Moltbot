# Course Ingest API Integration

This document describes how Moltbot agents can ingest course data into the course-ingest service.

## Environment Variables

Add these to your `.env` file (or Moltbot's environment):

```bash
COURSE_INGEST_URL=http://host.docker.internal:8088
COURSE_INGEST_TOKEN=8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y
```

### Networking Options

**From inside Docker containers (recommended for Moltbot):**
- `http://host.docker.internal:8088` - Works on Mac/Windows Docker Desktop
- `http://172.17.0.1:8088` - Works on Linux (default bridge network gateway)

**From host machine:**
- `http://localhost:8088` - Direct access

**Same Docker network:**
- Add both containers to the same network and use `http://course-ingest:8080`

## Endpoints

### Single Course Ingest

```bash
POST /v1/courses/ingest
Authorization: Bearer {COURSE_INGEST_TOKEN}
Content-Type: application/json

{
  "course": { ... },
  "teeSets": [ ... ],
  "holes": [ ... ],
  "amenities": [ ... ],
  "courseTypes": [ ... ]
}
```

### Batch Course Ingest

```bash
POST /v1/courses/ingest/batch
Authorization: Bearer {COURSE_INGEST_TOKEN}
Content-Type: application/json

[
  { "course": { ... }, "teeSets": [ ... ], ... },
  { "course": { ... }, "teeSets": [ ... ], ... },
  ...
]
```

**Response:**
```json
{
  "ok": true,
  "processed": 5,
  "succeeded": 4,
  "failed": 1,
  "results": [
    { "index": 0, "courseId": "course_123", "snapshotId": "...", "ok": true },
    ...
  ],
  "errors": [
    { "index": 2, "error": "invalid_payload", "details": { ... } }
  ]
}
```

## Example: Python Agent Code

```python
import os
import requests
import json

COURSE_INGEST_URL = os.getenv("COURSE_INGEST_URL", "http://host.docker.internal:8088")
COURSE_INGEST_TOKEN = os.getenv("COURSE_INGEST_TOKEN")

def ingest_course(course_data):
    """Ingest a single course"""
    response = requests.post(
        f"{COURSE_INGEST_URL}/v1/courses/ingest",
        headers={
            "Authorization": f"Bearer {COURSE_INGEST_TOKEN}",
            "Content-Type": "application/json"
        },
        json=course_data
    )
    response.raise_for_status()
    return response.json()

def ingest_courses_batch(courses_data):
    """Ingest multiple courses at once"""
    response = requests.post(
        f"{COURSE_INGEST_URL}/v1/courses/ingest/batch",
        headers={
            "Authorization": f"Bearer {COURSE_INGEST_TOKEN}",
            "Content-Type": "application/json"
        },
        json=courses_data  # array of course payloads
    )
    response.raise_for_status()
    return response.json()

# Example usage
course = {
    "course": {
        "id": "course_example_123",
        "name": "Example Golf Course",
        "city": "Lansing",
        "state": "MI",
        "geoLat": 42.716,
        "geoLng": -84.427,
        ...
    },
    "teeSets": [
        { "color": "Blue", "rating": 71.9, "slope": 125, "par": 71, ... },
        ...
    ],
    "holes": [
        { "teeSetId": "...", "holeNumber": 1, "par": 4, "distance": 423, ... },
        ...
    ],
    "amenities": [
        { "name": "Driving Range", "category": "practice" },
        ...
    ],
    "courseTypes": [
        { "groupKey": "access", "typeKey": "public" },
        ...
    ]
}

result = ingest_course(course)
print(f"Ingested: {result['courseId']}")
```

## Example: Node.js/JavaScript Agent Code

```javascript
const fetch = require('node-fetch');

const COURSE_INGEST_URL = process.env.COURSE_INGEST_URL || 'http://host.docker.internal:8088';
const COURSE_INGEST_TOKEN = process.env.COURSE_INGEST_TOKEN;

async function ingestCourse(courseData) {
  const response = await fetch(`${COURSE_INGEST_URL}/v1/courses/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COURSE_INGEST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(courseData)
  });
  
  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.statusText}`);
  }
  
  return await response.json();
}

async function ingestCoursesBatch(coursesData) {
  const response = await fetch(`${COURSE_INGEST_URL}/v1/courses/ingest/batch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COURSE_INGEST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(coursesData)
  });
  
  if (!response.ok) {
    throw new Error(`Batch ingest failed: ${response.statusText}`);
  }
  
  return await response.json();
}
```

## Example: Shell Script

```bash
#!/bin/bash

COURSE_INGEST_URL="${COURSE_INGEST_URL:-http://host.docker.internal:8088}"
COURSE_INGEST_TOKEN="${COURSE_INGEST_TOKEN}"

# Single course
curl -X POST "${COURSE_INGEST_URL}/v1/courses/ingest" \
  -H "Authorization: Bearer ${COURSE_INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @course.json

# Batch
curl -X POST "${COURSE_INGEST_URL}/v1/courses/ingest/batch" \
  -H "Authorization: Bearer ${COURSE_INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @courses.json
```

## Error Handling

The batch endpoint processes all courses and returns both successes and failures:

```python
result = ingest_courses_batch([course1, course2, course3])

if result['failed'] > 0:
    print(f"Warning: {result['failed']} courses failed to ingest")
    for error in result['errors']:
        print(f"  Index {error['index']}: {error['error']}")

print(f"Successfully ingested {result['succeeded']} courses")
```

## Deterministic IDs

The service generates deterministic IDs for:
- **Tee sets**: `{courseId}_tee_{color}_{name}`
- **Holes**: `{teeSetId}_hole_{holeNumber}`
- **Amenities**: Stable hash based on `(name, category)`

This ensures idempotent ingestion - re-ingesting the same data produces the same IDs.
