DROP TABLE IF EXISTS recipes;
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  category TEXT,
  image_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'bug' | 'idea'
  description TEXT,
  expected TEXT,
  actual TEXT,
  screenshot TEXT, -- base64 string
  logs TEXT, -- JSON string
  context TEXT, -- JSON string
  timestamp TEXT DEFAULT (datetime('now'))
);
