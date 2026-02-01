-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Canonical current course record
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  timezone TEXT,
  status TEXT,
  moderation_status TEXT,
  holes INTEGER,
  geom GEOGRAPHY(Point, 4326),
  address JSONB,
  playability JSONB,
  pricing_meta JSONB,
  media JSONB,
  provenance JSONB,
  source_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast geo queries
CREATE INDEX IF NOT EXISTS courses_geom_gix ON courses USING GIST (geom);
CREATE INDEX IF NOT EXISTS courses_state_city_idx ON courses (state, city);
CREATE INDEX IF NOT EXISTS courses_domain_idx ON courses (domain);

-- Classification tags
CREATE TABLE IF NOT EXISTS course_types (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  type_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, group_key, type_key)
);
CREATE INDEX IF NOT EXISTS course_types_group_type_idx ON course_types (group_key, type_key);

-- Immutable snapshots (history)
CREATE TABLE IF NOT EXISTS course_snapshots (
  snapshot_id UUID PRIMARY KEY,
  course_id TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL,
  source_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  provenance JSONB,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS course_snapshots_course_id_idx ON course_snapshots (course_id, fetched_at DESC);