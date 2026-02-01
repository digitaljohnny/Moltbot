-- Add payload_hash column to course_snapshots for idempotency
-- This allows deduplication: same payload hash = same snapshot

ALTER TABLE course_snapshots 
ADD COLUMN IF NOT EXISTS payload_hash TEXT;

-- Create unique constraint on payload_hash to enforce idempotency
-- Note: We use a unique constraint (not partial index) so ON CONFLICT works
-- NULL values are allowed (for old snapshots), but duplicate non-NULL values are prevented
CREATE UNIQUE INDEX IF NOT EXISTS course_snapshots_payload_hash_idx 
ON course_snapshots (payload_hash);

-- Index for faster lookups (redundant but explicit)
CREATE INDEX IF NOT EXISTS course_snapshots_payload_hash_lookup_idx 
ON course_snapshots (payload_hash);
