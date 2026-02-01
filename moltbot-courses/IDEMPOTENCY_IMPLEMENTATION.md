# Idempotency Implementation

## Overview

The ingest API now implements **"one snapshot per unique payload hash"** (dedupe strategy). This means:

- Same payload hash → same snapshot (idempotent)
- Different payload → new snapshot (history preserved)
- Double-tap protection: clicking "Ingest" twice returns the same snapshotId

## Implementation Details

### Database Schema

**Migration:** `sql/003_idempotency.sql`

```sql
-- Add payload_hash column to course_snapshots
ALTER TABLE course_snapshots 
ADD COLUMN IF NOT EXISTS payload_hash TEXT;

-- Unique constraint on payload_hash (enforces idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS course_snapshots_payload_hash_idx 
ON course_snapshots (payload_hash) 
WHERE payload_hash IS NOT NULL;
```

### Payload Hash Computation

Both Python (proposal manager) and JavaScript (ingest API) compute the same hash:

**Python:**
```python
normalized = json.dumps(payload, sort_keys=True, separators=(',', ':'))
payload_hash = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
```

**JavaScript:**
```javascript
function normalizeJSON(obj) {
  if (obj === null || typeof obj !== "object" || obj instanceof Date) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(normalizeJSON).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return "{" + keys.map(k => `"${k}":${normalizeJSON(obj[k])}`).join(",") + "}";
}
const normalizedPayload = normalizeJSON(payload);
const payloadHash = crypto.createHash("sha256").update(normalizedPayload).digest("hex");
```

Both produce identical hashes for the same payload.

### API Behavior

**Single Ingest (`POST /v1/courses/ingest`):**

1. Compute payload hash
2. Check for existing snapshot with same hash
3. If found → return existing snapshotId (idempotent)
4. If not found → create new snapshot with hash
5. Handle race condition: if INSERT fails due to unique constraint, fetch existing

**Response:**
```json
{
  "ok": true,
  "courseId": "course_123",
  "snapshotId": "abc-123",
  "idempotent": true  // or false for new snapshot
}
```

**Batch Ingest (`POST /v1/courses/ingest/batch`):**

- Same logic per payload
- Each result includes `idempotent` flag

### Idempotency-Key Header

The proposal manager sends `Idempotency-Key: <payload_hash>` header, but the API currently uses payload hash computation directly (more reliable than trusting the header). The header is accepted but not required.

## Testing

### Test 1: Double-Tap Protection

```bash
# First request
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @course.json

# Response: {"ok": true, "courseId": "...", "snapshotId": "abc-123", "idempotent": false}

# Second request (same payload)
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @course.json

# Response: {"ok": true, "courseId": "...", "snapshotId": "abc-123", "idempotent": true}
```

### Test 2: Different Payloads

```bash
# Request with modified payload (different hash)
# Should create new snapshot
```

### Test 3: Race Condition

Two simultaneous requests with same payload:
- Both check for existing → both see none
- Both try INSERT → one succeeds, one gets conflict
- Conflict handler fetches existing snapshotId
- Both return same snapshotId

## Migration

The migration is **idempotent** (safe to run multiple times):

```sql
-- Already applied? No problem, IF NOT EXISTS handles it
ALTER TABLE course_snapshots ADD COLUMN IF NOT EXISTS payload_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ...
```

**Existing snapshots:**
- Old snapshots have `payload_hash = NULL`
- New ingests compute and store hash
- Old snapshots can be backfilled later if needed (optional)

## Benefits

1. **Double-tap protection**: User clicks "Ingest" twice → same result
2. **Retry safety**: Network errors, retries → same snapshotId
3. **Parallel safety**: Multiple agents propose same course → only one snapshot
4. **Clean responses**: Returns `idempotent: true` flag for transparency

## Edge Cases Handled

- **Race conditions**: Two requests with same payload → both get same snapshotId
- **NULL payload_hash**: Old snapshots work fine (no constraint violation)
- **Hash collision**: SHA-256 collision is astronomically unlikely, but if it happens, unique constraint prevents duplicate
