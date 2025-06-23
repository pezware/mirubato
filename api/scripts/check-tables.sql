-- Check which tables exist in the database
SELECT name, sql FROM sqlite_master 
WHERE type='table' 
ORDER BY name;

-- Check if sync_data exists specifically
SELECT COUNT(*) as sync_data_exists 
FROM sqlite_master 
WHERE type='table' AND name='sync_data';

-- Check if logbook_entries exists
SELECT COUNT(*) as logbook_entries_exists 
FROM sqlite_master 
WHERE type='table' AND name='logbook_entries';

-- Check if goals exists
SELECT COUNT(*) as goals_exists 
FROM sqlite_master 
WHERE type='table' AND name='goals';

-- Check number of users
SELECT COUNT(*) as user_count FROM users;