DROP TABLE IF EXISTS recipes;
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  protein TEXT,
  meal_type TEXT,
  dish_type TEXT,
  equipment TEXT, -- JSON Array
  occasion TEXT, -- JSON Array
  dietary TEXT, -- JSON Array
  difficulty TEXT,
  cuisine TEXT,
  is_favorite INTEGER DEFAULT 0, -- boolean (DEPRECATED for user-specific)
  this_week INTEGER DEFAULT 0, -- boolean
  created_at INTEGER, -- stored as timestamp
  updated_at INTEGER, -- stored as timestamp
  data TEXT -- JSON blob for full recipe structure
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

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  created_at INTEGER,
  PRIMARY KEY (user_id, recipe_id)
);
