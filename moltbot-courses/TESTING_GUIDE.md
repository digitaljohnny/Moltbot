# Testing Guide: Idempotency & Dual Instructions

## Prerequisites

1. **Apply database migration:**
   ```bash
   cd ~/moltbot-courses
   docker compose -f docker-compose.courses.yml restart course-ingest
   # Migration runs automatically (ensureSchema applies all .sql files)
   ```

2. **Verify migration applied:**
   ```bash
   docker exec courses-db psql -U courses -d courses -c "\d course_snapshots"
   # Should show payload_hash column
   ```

## Test 1: Idempotency - Double-Tap Protection

### Setup
Create a test course JSON file (`test_course.json`):

```json
{
  "course": {
    "id": "course_test_123",
    "name": "Test Golf Course",
    "city": "Test City",
    "state": "MI",
    "geoLat": 42.7,
    "geoLng": -84.4
  }
}
```

### Test Steps

**Step 1: First ingest (should create new snapshot)**
```bash
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_course.json
```

**Expected Response:**
```json
{
  "ok": true,
  "courseId": "course_test_123",
  "snapshotId": "abc-123-def-456",
  "idempotent": false
}
```

**Step 2: Second ingest (same payload - should return existing snapshot)**
```bash
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_course.json
```

**Expected Response:**
```json
{
  "ok": true,
  "courseId": "course_test_123",
  "snapshotId": "abc-123-def-456",  // Same snapshotId!
  "idempotent": true
}
```

**Step 3: Verify database (only one snapshot)**
```bash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT snapshot_id, payload_hash, fetched_at FROM course_snapshots WHERE course_id = 'course_test_123';"
```

**Expected:** Only one row with a non-null `payload_hash`

### Test 2: Different Payloads Create New Snapshots

**Step 1: Modify payload slightly**
```json
{
  "course": {
    "id": "course_test_123",
    "name": "Test Golf Course UPDATED",  // Changed
    "city": "Test City",
    "state": "MI",
    "geoLat": 42.7,
    "geoLng": -84.4
  }
}
```

**Step 2: Ingest modified payload**
```bash
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_course_modified.json
```

**Expected Response:**
```json
{
  "ok": true,
  "courseId": "course_test_123",
  "snapshotId": "xyz-789-abc-012",  // Different snapshotId!
  "idempotent": false
}
```

**Step 3: Verify database (two snapshots)**
```bash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT snapshot_id, LEFT(payload_hash, 16) as hash_prefix, fetched_at FROM course_snapshots WHERE course_id = 'course_test_123' ORDER BY fetched_at;"
```

**Expected:** Two rows with different `payload_hash` values

## Test 3: Telegram Dual Instructions (Edit + Receipt)

### Setup
1. Ensure proposal manager is integrated with Telegram
2. Create a proposal via golf-course-research skill
3. Proposal card should appear with inline buttons

### Test Steps

**Step 1: Click "Ingest" button**

**Expected Behavior:**
1. ✅ Original proposal card updates:
   - Text shows "✅ **Ingested** at [time]"
   - Buttons are cleared/removed
2. ✅ Separate receipt message appears:
   - "✅ **Ingested** at [time]\nCourse ID: `course_123`\nSnapshot: `snapshot_456`"

**Step 2: Verify in database**
```bash
docker exec moltbot-setup sqlite3 /root/clawd/data/course_proposals.db \
  "SELECT proposal_id, status, course_id, snapshot_id FROM proposals WHERE status = 'ingested' ORDER BY ingested_at DESC LIMIT 1;"
```

**Expected:** Proposal status = `ingested`, with `course_id` and `snapshot_id` populated

### Troubleshooting Edit Message

**If buttons don't clear:**

Your Telegram library might require separate calls. Check the integration code:

```python
# Option 1: Single call (if supported)
edit_message_text(
    chat_id=chat_id,
    message_id=message_id,
    text=new_text,
    reply_markup={"inline_keyboard": []}
)

# Option 2: Separate calls (if needed)
edit_message_text(chat_id, message_id, new_text)
edit_message_reply_markup(chat_id, message_id, reply_markup={"inline_keyboard": []})
```

Update `execute_telegram_instruction()` in your integration to handle this.

## Test 4: Race Condition (Parallel Requests)

### Setup
Two simultaneous requests with identical payloads.

### Test Steps

**Step 1: Send two requests simultaneously**
```bash
# Terminal 1
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_course.json &

# Terminal 2 (immediately)
curl -X POST "http://localhost:8088/v1/courses/ingest" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_course.json &
```

**Expected Behavior:**
- Both requests return same `snapshotId`
- One has `idempotent: false` (first to complete INSERT)
- One has `idempotent: true` (second hit conflict, fetched existing)
- Database has only one snapshot row

**Step 2: Verify database**
```bash
docker exec courses-db psql -U courses -d courses -c \
  "SELECT COUNT(*) FROM course_snapshots WHERE course_id = 'course_test_123';"
```

**Expected:** `1` (only one snapshot)

## Test 5: Batch Ingest Idempotency

### Test Steps

**Step 1: Create batch with duplicate payloads**
```json
[
  {
    "course": {
      "id": "course_batch_1",
      "name": "Batch Course 1",
      "city": "City",
      "state": "MI"
    }
  },
  {
    "course": {
      "id": "course_batch_1",  // Same course
      "name": "Batch Course 1",  // Same payload
      "city": "City",
      "state": "MI"
    }
  }
]
```

**Step 2: Send batch request**
```bash
curl -X POST "http://localhost:8088/v1/courses/ingest/batch" \
  -H "Authorization: Bearer $COURSE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @test_batch.json
```

**Expected Response:**
```json
{
  "ok": true,
  "processed": 2,
  "succeeded": 2,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "courseId": "course_batch_1",
      "snapshotId": "snapshot-123",
      "ok": true,
      "idempotent": false
    },
    {
      "index": 1,
      "courseId": "course_batch_1",
      "snapshotId": "snapshot-123",  // Same snapshotId!
      "ok": true,
      "idempotent": true
    }
  ]
}
```

## Test 6: Proposal Manager Integration

### Test Steps

**Step 1: Create proposal via golf-course-research**
- Research a course
- Proposal card appears with buttons

**Step 2: Click "Ingest"**
- Verify dual instructions execute
- Verify proposal status updates in SQLite

**Step 3: Click "Ingest" again (should be idempotent)**
- Verify: Returns same snapshotId
- Verify: Proposal status remains `ingested`
- Verify: No duplicate snapshot in database

**Step 4: Click "View JSON"**
- Verify: JSON file sent as document
- Verify: File contains correct payload

**Step 5: Create new proposal, click "Skip"**
- Verify: Proposal card updates to show "⏭️ **Skipped**"
- Verify: Receipt message sent
- Verify: Proposal status = `skipped` in database

## Verification Queries

### Check idempotency is working:
```sql
-- Should show unique payload_hash values (no duplicates)
SELECT course_id, COUNT(*) as snapshot_count, COUNT(DISTINCT payload_hash) as unique_hashes
FROM course_snapshots
WHERE payload_hash IS NOT NULL
GROUP BY course_id
HAVING COUNT(*) != COUNT(DISTINCT payload_hash);
-- Should return 0 rows (all snapshots have unique hashes)
```

### Check proposal statuses:
```bash
docker exec moltbot-setup sqlite3 /root/clawd/data/course_proposals.db \
  "SELECT proposal_id, status, course_id, snapshot_id, created_at FROM proposals ORDER BY created_at DESC LIMIT 10;"
```

## Common Issues & Fixes

### Issue: "duplicate key value violates unique constraint"
**Cause:** Race condition not handled properly  
**Fix:** Verify the `ON CONFLICT` handling in snapshot insert

### Issue: Buttons don't clear
**Cause:** Telegram library doesn't support `reply_markup` in `edit_message_text`  
**Fix:** Use separate `edit_message_reply_markup` call

### Issue: Different hashes for same payload
**Cause:** JSON normalization differs between Python/JavaScript  
**Fix:** Verify both use same normalization (sorted keys, no whitespace)

### Issue: `payload_hash` is NULL
**Cause:** Old snapshots created before migration  
**Fix:** This is expected - only new snapshots have hashes. Old ones work fine.

## Success Criteria

✅ Double-tap returns same snapshotId  
✅ Different payloads create new snapshots  
✅ Race conditions handled correctly  
✅ Proposal card edits + receipt message both appear  
✅ Buttons clear after ingest/skip  
✅ Batch ingest handles duplicates correctly  
✅ Database constraints prevent duplicate snapshots
