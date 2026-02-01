-- Tee sets (store rating/slope/par + optional name)
CREATE TABLE IF NOT EXISTS tee_sets (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  color TEXT,
  name TEXT,
  rating DOUBLE PRECISION,
  slope INTEGER,
  par INTEGER,
  units TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tee_sets_course_id_idx ON tee_sets (course_id);

-- Holes (one row per hole per tee set)
CREATE TABLE IF NOT EXISTS holes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tee_set_id TEXT NOT NULL REFERENCES tee_sets(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER,
  handicap_index INTEGER,
  distance INTEGER,
  hazards JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tee_set_id, hole_number)
);

CREATE INDEX IF NOT EXISTS holes_course_id_idx ON holes (course_id);
CREATE INDEX IF NOT EXISTS holes_tee_set_id_idx ON holes (tee_set_id);

-- Amenities: de-dupe by (name, category)
CREATE TABLE IF NOT EXISTS amenities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, category)
);

-- Join table: courses <-> amenities
CREATE TABLE IF NOT EXISTS course_amenities (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amenity_id TEXT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS course_amenities_course_id_idx ON course_amenities (course_id);
