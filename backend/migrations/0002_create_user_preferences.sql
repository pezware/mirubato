-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL, -- JSON data
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);