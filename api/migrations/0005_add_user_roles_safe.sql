-- Add role field to users table for role-based access control
-- This enables admin, teacher, and regular user distinctions
-- 
-- IMPORTANT: This migration preserves email casing to maintain compatibility
-- with existing auth tokens. Email normalization is handled in application code.
--
-- NOTE: This migration avoids dropping the users table to prevent cascade deletion
-- of user data in related tables (sync_data, logbook_entries, etc.)

-- SQLite doesn't support ALTER COLUMN, so we need to be creative
-- First, add the role column
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

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

-- Note: We cannot modify the primary_instrument column constraints in SQLite
-- without recreating the table. Since this would cause data loss, we'll handle
-- the 'BOTH' option validation in application code instead.