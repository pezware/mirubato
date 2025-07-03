-- Add role field to users table for role-based access control
-- This enables admin, teacher, and regular user distinctions
-- 
-- IMPORTANT: This migration preserves email casing to maintain compatibility
-- with existing auth tokens. Email normalization is handled in application code.
--
-- NOTE: This migration avoids dropping the users table to prevent cascade deletion
-- of user data in related tables (sync_data, logbook_entries, etc.)

-- Since the role column may already exist from a previous partial migration,
-- we'll just ensure the rest of the migration completes

-- Create index for efficient role-based queries (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Automatically set admin role for @mirubato.com email addresses
UPDATE users SET role = 'admin' WHERE email LIKE '%@mirubato.com' AND role != 'admin';

-- Drop triggers if they exist to avoid errors
DROP TRIGGER IF EXISTS auto_assign_admin_role;
DROP TRIGGER IF EXISTS auto_update_admin_role;

-- Create trigger to auto-assign admin role for new @mirubato.com users
CREATE TRIGGER auto_assign_admin_role
AFTER INSERT ON users
WHEN NEW.email LIKE '%@mirubato.com'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;

-- Create trigger to auto-assign admin role on email update
CREATE TRIGGER auto_update_admin_role
AFTER UPDATE OF email ON users
WHEN NEW.email LIKE '%@mirubato.com' AND OLD.role != 'admin'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;

-- Note: We cannot modify the primary_instrument column constraints in SQLite
-- without recreating the table. Since this would cause data loss, we'll handle
-- the 'BOTH' option validation in application code instead.