-- Update collections schema for enhanced role-based access and visibility inheritance
-- This migration refactors collections to support admin curation and teacher sharing

-- Add owner_type to distinguish between user/admin collections
ALTER TABLE user_collections ADD COLUMN owner_type TEXT DEFAULT 'user' 
  CHECK (owner_type IN ('user', 'admin', 'teacher'));

-- Add shared_with field for teacher sharing functionality
-- This will store a JSON array of user IDs who have access to the collection
ALTER TABLE user_collections ADD COLUMN shared_with TEXT DEFAULT '[]';

-- Add featured_at timestamp for admin-featured collections
ALTER TABLE user_collections ADD COLUMN featured_at DATETIME;

-- Add featured_by to track which admin featured the collection
ALTER TABLE user_collections ADD COLUMN featured_by TEXT;

-- Create index for featured collections
CREATE INDEX IF NOT EXISTS idx_user_collections_featured ON user_collections(featured_at);

-- Add derived_visibility to scores table for collection-based visibility
-- This allows scores to inherit visibility from their collections
ALTER TABLE scores ADD COLUMN derived_visibility TEXT;

-- Create index for efficient visibility queries
CREATE INDEX IF NOT EXISTS idx_scores_derived_visibility ON scores(derived_visibility);

-- Create a table to track collection visibility changes
CREATE TABLE IF NOT EXISTS collection_visibility_log (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  old_visibility TEXT,
  new_visibility TEXT,
  changed_by TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES user_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE
);

-- Create indexes for visibility log
CREATE INDEX IF NOT EXISTS idx_visibility_log_collection ON collection_visibility_log(collection_id);
CREATE INDEX IF NOT EXISTS idx_visibility_log_score ON collection_visibility_log(score_id);

-- Function to update score visibility based on collections
-- Note: SQLite doesn't support stored procedures, so this logic will be in application code
-- This is documentation of the intended behavior:
-- 1. If score is in any public/featured collection → derived_visibility = 'public'
-- 2. If score is only in private collections → derived_visibility = 'private'
-- 3. Original visibility field remains as user's preference

-- Migrate existing platform collections to admin-owned collections
UPDATE user_collections 
SET owner_type = 'admin', 
    visibility = 'public',
    featured_at = CURRENT_TIMESTAMP
WHERE collection_type = 'platform';

-- Ensure all user-created collections have correct owner_type
UPDATE user_collections 
SET owner_type = 'user'
WHERE collection_type = 'personal' AND owner_type IS NULL;

-- Create default featured collections if they don't exist
-- These will be inserted via application code to ensure proper IDs

-- Add description to existing collections table for better organization
ALTER TABLE collections ADD COLUMN featured_order INTEGER DEFAULT 0;
ALTER TABLE collections ADD COLUMN created_by TEXT;

-- Migrate data from old collections table to user_collections
-- This preserves existing curated collections as admin collections
INSERT INTO user_collections (
  id, 
  user_id, 
  name, 
  description, 
  slug, 
  visibility, 
  collection_type, 
  owner_type,
  featured_at,
  display_order,
  created_at,
  updated_at
)
SELECT 
  id,
  'system', -- System user for platform collections
  name,
  description,
  slug,
  'public',
  'platform',
  'admin',
  CASE WHEN is_featured = 1 THEN created_at ELSE NULL END,
  display_order,
  created_at,
  updated_at
FROM collections
WHERE NOT EXISTS (
  SELECT 1 FROM user_collections WHERE slug = collections.slug
);

-- Copy collection members for migrated collections
INSERT INTO collection_members (id, collection_id, score_id, display_order, added_at)
SELECT 
  lower(hex(randomblob(16))), -- Generate new ID
  c.id,
  json_each.value,
  json_each.key,
  CURRENT_TIMESTAMP
FROM collections c, json_each(c.score_ids)
WHERE EXISTS (
  SELECT 1 FROM user_collections WHERE id = c.id
)
AND NOT EXISTS (
  SELECT 1 FROM collection_members 
  WHERE collection_id = c.id AND score_id = json_each.value
);