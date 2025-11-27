-- Create user_score_favorites table for user's favorite/starred scores
-- This enables users to quickly access their favorite scores

CREATE TABLE IF NOT EXISTS user_score_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(user_id, score_id)  -- Prevent duplicate favorites
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_score_favorites_user_id ON user_score_favorites(user_id);
CREATE INDEX idx_user_score_favorites_score_id ON user_score_favorites(score_id);
CREATE INDEX idx_user_score_favorites_created_at ON user_score_favorites(created_at);
