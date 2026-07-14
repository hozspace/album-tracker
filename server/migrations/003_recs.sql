CREATE TABLE IF NOT EXISTS recs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  mbid TEXT,
  art_url TEXT,
  because TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('deepen','branch','wildcard')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','logged','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recs_status ON recs (status, created_at DESC);
