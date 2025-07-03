-- Fix user roles setup - handles case where primary_instrument already exists
-- This migration completes the setup that 0005 couldn't finish

-- Create index for role if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to set admin role for @mirubato.com emails
UPDATE users SET role = 'admin' WHERE email LIKE '%@mirubato.com' AND role = 'user';

-- Drop and recreate triggers to ensure they're properly set up
DROP TRIGGER IF EXISTS auto_assign_admin_role;
CREATE TRIGGER auto_assign_admin_role
AFTER INSERT ON users
WHEN NEW.email LIKE '%@mirubato.com'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS auto_update_admin_role;
CREATE TRIGGER auto_update_admin_role
AFTER UPDATE OF email ON users
WHEN NEW.email LIKE '%@mirubato.com' AND OLD.role != 'admin'
BEGIN
  UPDATE users SET role = 'admin' WHERE id = NEW.id;
END;