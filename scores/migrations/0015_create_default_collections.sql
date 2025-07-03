-- Create default collections for the system
-- These are admin-curated collections that all users can see

-- Helper to generate deterministic IDs for system collections
-- Using predictable IDs makes it easier to reference them in code

-- Featured Collections for different skill levels and instruments

-- Beginner Piano Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-beginner-piano',
  'system',
  'Beginner Piano Essentials',
  'A curated collection of essential pieces for beginning piano students',
  'beginner-piano-essentials',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  1,
  '["beginner", "piano", "essential", "featured"]'
);

-- Beginner Guitar Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-beginner-guitar',
  'system',
  'Beginner Guitar Foundations',
  'Fundamental pieces for beginning classical guitar students',
  'beginner-guitar-foundations',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  2,
  '["beginner", "guitar", "foundation", "featured"]'
);

-- Intermediate Piano Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-intermediate-piano',
  'system',
  'Intermediate Piano Repertoire',
  'Standard repertoire for intermediate piano students',
  'intermediate-piano-repertoire',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  3,
  '["intermediate", "piano", "repertoire", "featured"]'
);

-- Advanced Guitar Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-advanced-guitar',
  'system',
  'Advanced Guitar Masterworks',
  'Challenging pieces for advanced classical guitar students',
  'advanced-guitar-masterworks',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  4,
  '["advanced", "guitar", "masterwork", "featured"]'
);

-- Sight-Reading Practice Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-sight-reading',
  'system',
  'Sight-Reading Practice',
  'Graded exercises for improving sight-reading skills',
  'sight-reading-practice',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  5,
  '["sight-reading", "practice", "exercise", "featured"]'
);

-- Popular Classics Collection
INSERT OR IGNORE INTO user_collections (
  id,
  user_id,
  name,
  description,
  slug,
  visibility,
  is_default,
  collection_type,
  owner_type,
  featured_at,
  display_order,
  tags
) VALUES (
  'featured-popular-classics',
  'system',
  'Popular Classics',
  'Well-known classical pieces that everyone loves',
  'popular-classics',
  'public',
  0,
  'platform',
  'admin',
  CURRENT_TIMESTAMP,
  6,
  '["popular", "classical", "favorites", "featured"]'
);

-- Add existing scores to appropriate collections based on their metadata
-- This will be done through the application to ensure proper validation

-- Update trigger to ensure new users get a default "General" collection
CREATE TRIGGER IF NOT EXISTS create_default_user_collection
AFTER INSERT ON users
BEGIN
  -- This trigger would need to be in the API database
  -- Documenting the intended behavior here:
  -- When a new user is created, automatically create their default "General" collection
  -- This ensures every user has at least one collection for organizing their scores
END;