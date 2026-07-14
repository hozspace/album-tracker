CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  art_url TEXT,
  rating REAL NOT NULL,
  fave_track TEXT,
  listened_on TEXT NOT NULL,
  relisten INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_listened_on ON logs (listened_on DESC);
