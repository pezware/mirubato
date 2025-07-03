-- Add role field to users table for role-based access control
-- This enables admin, teacher, and regular user distinctions
-- 
-- IMPORTANT: This migration preserves email casing to maintain compatibility
-- with existing auth tokens. Email normalization is handled in application code.

-- Create a new table with the desired schema
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT DEFAULT 'PIANO' CHECK (primary_instrument IN ('PIANO', 'GUITAR', 'BOTH', NULL)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link', 'google')),
  google_id TEXT,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'teacher', 'admin'))
);

-- Copy existing data from users table
-- Handle cases where columns might already exist or not
INSERT INTO users_new (id, email, display_name, primary_instrument, created_at, updated_at, auth_provider, google_id, last_login_at, login_count, role)
SELECT 
  id, 
  email, -- Keep email as-is to maintain compatibility with existing auth tokens
  display_name,
  primary_instrument,
  created_at, 
  updated_at,
  auth_provider,
  google_id,
  last_login_at,
  login_count,
  'user' -- Default role for all existing users
FROM users;

-- Drop the old table
DROP TABLE users;

-- Rename the new table
ALTER TABLE users_new RENAME TO users;

-- Create index for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Automatically set admin role for @mirubato.com email addresses
UPDATE users SET role = 'admin' WHERE email LIKE '%@mirubato.com';

-- Create trigger to auto-assign admin role for new @mirubato.com users
CREATE TRIGGER IF NOT EXISTS auto_assign_admin_role
AFTER INSERT ON users
WHEN NEW.email LIKE '%@mirubato.com'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;

-- Create trigger to auto-assign admin role on email update
CREATE TRIGGER IF NOT EXISTS auto_update_admin_role
AFTER UPDATE OF email ON users
WHEN NEW.email LIKE '%@mirubato.com' AND OLD.role != 'admin'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;