-- Create test user in staging
INSERT OR IGNORE INTO users (id, email, display_name, primary_instrument, created_at, updated_at)
VALUES ('test-user-123', 'test@example.com', 'Test User', 'PIANO', datetime('now'), datetime('now'));

-- Create some test logbook entries
INSERT OR IGNORE INTO logbook_entries (
  id, user_id, timestamp, duration, type, instrument, 
  pieces, techniques, goal_ids, notes, tags, metadata,
  created_at, updated_at
) VALUES 
(
  'test-entry-1',
  'test-user-123',
  strftime('%s', 'now') * 1000,
  30,
  'PRACTICE',
  'PIANO',
  '[]',
  '[]',
  '[]',
  'Test practice session',
  '[]',
  '{"source": "manual"}',
  datetime('now'),
  datetime('now')
),
(
  'test-entry-2',
  'test-user-123',
  strftime('%s', 'now') * 1000 - 3600000,
  45,
  'PRACTICE',
  'GUITAR',
  '[]',
  '[]',
  '[]',
  'Another test session',
  '[]',
  '{"source": "manual"}',
  datetime('now'),
  datetime('now')
);

-- Create a test goal
INSERT OR IGNORE INTO goals (
  id, user_id, title, description, target_date, status,
  progress, milestones, linked_entries, created_at, updated_at
) VALUES (
  'test-goal-1',
  'test-user-123',
  'Practice 30 minutes daily',
  'Build consistent practice habits',
  date('now', '+30 days'),
  'ACTIVE',
  25,
  '[]',
  '["test-entry-1", "test-entry-2"]',
  datetime('now'),
  datetime('now')
);

-- Verify data was inserted
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'logbook_entries', COUNT(*) FROM logbook_entries
UNION ALL
SELECT 'goals', COUNT(*) FROM goals;