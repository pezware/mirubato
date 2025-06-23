-- Test sync_data table structure
-- Run this before migration to ensure tables are ready

-- Check if sync_data table exists and show its structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='sync_data';

-- Check if sync_metadata table exists
SELECT sql FROM sqlite_master WHERE type='table' AND name='sync_metadata';

-- Check if migration_runs table exists (will be created by migration script)
SELECT sql FROM sqlite_master WHERE type='table' AND name='migration_runs';

-- Test insert into sync_data (will rollback)
BEGIN TRANSACTION;

INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version)
VALUES (
  'test_sync_123',
  'test_user_123',
  'logbook_entry',
  'test_entry_123',
  '{"id":"test_entry_123","type":"PRACTICE","duration":3600}',
  'test_checksum_123',
  1
);

-- Verify the insert worked
SELECT * FROM sync_data WHERE id = 'test_sync_123';

-- Test the unique constraint
INSERT INTO sync_data (id, user_id, entity_type, entity_id, data, checksum, version)
VALUES (
  'test_sync_456',
  'test_user_123',
  'logbook_entry',
  'test_entry_123', -- Same entity_id, should conflict
  '{"id":"test_entry_123","type":"PRACTICE","duration":7200}',
  'test_checksum_456',
  1
) ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET version = version + 1;

-- Check that version was incremented
SELECT * FROM sync_data WHERE entity_id = 'test_entry_123';

ROLLBACK;

-- Verify test data was rolled back
SELECT COUNT(*) as should_be_zero FROM sync_data WHERE entity_id = 'test_entry_123';