-- Create general collection for existing platform scores
-- This ensures all existing scores are properly organized

-- Create the general collection (if it doesn't exist)
INSERT OR IGNORE INTO user_collections (
  id, 
  user_id, 
  name, 
  slug, 
  description, 
  visibility, 
  collection_type, 
  score_ids,
  is_default,
  display_order
) VALUES (
  'general-collection',
  'platform',
  'General Collection',
  'general',
  'Curated sheet music for all users',
  'public',
  'platform',
  '[]',
  0,
  0
);

-- Get all public platform scores and add them to collection_members
INSERT OR IGNORE INTO collection_members (id, collection_id, score_id)
SELECT 
  'cm_' || ROW_NUMBER() OVER (ORDER BY s.created_at),
  'general-collection',
  s.id
FROM scores s
WHERE s.visibility = 'public' 
  AND (s.user_id IS NULL OR s.user_id = '');

-- Update the score_ids JSON array in user_collections
UPDATE user_collections 
SET score_ids = (
  SELECT json_group_array(score_id)
  FROM collection_members
  WHERE collection_id = 'general-collection'
)
WHERE id = 'general-collection';