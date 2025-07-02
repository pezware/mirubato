-- Create user_collections table for user-specific score organization
-- This enables users to organize their scores into personal collections

CREATE TABLE IF NOT EXISTS user_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,  -- URL-friendly name
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  is_default BOOLEAN DEFAULT FALSE,  -- Flag for "My Uploads" collection
  collection_type TEXT DEFAULT 'personal' CHECK (collection_type IN ('personal', 'professional', 'platform')),
  score_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array of score IDs
  tags TEXT DEFAULT '[]',  -- JSON array of tags for organization
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)  -- Ensure unique slugs per user
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_user_collections_visibility ON user_collections(visibility);
CREATE INDEX idx_user_collections_type ON user_collections(collection_type);
CREATE INDEX idx_user_collections_default ON user_collections(is_default);

-- Add trigger for updated_at
CREATE TRIGGER update_user_collections_timestamp 
AFTER UPDATE ON user_collections
BEGIN
  UPDATE user_collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create collection members table for better performance with large collections
CREATE TABLE IF NOT EXISTS collection_members (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES user_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(collection_id, score_id)  -- Prevent duplicate scores in a collection
);

-- Create indexes for collection members
CREATE INDEX idx_collection_members_collection ON collection_members(collection_id);
CREATE INDEX idx_collection_members_score ON collection_members(score_id);