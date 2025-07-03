-- Add role field to users table for role-based access control
-- This enables admin, teacher, and regular user distinctions

-- Add role column with default 'user'
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' 
  CHECK (role IN ('user', 'teacher', 'admin'));

-- Create index for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Automatically set admin role for @mirubato.com email addresses
UPDATE users SET role = 'admin' WHERE email LIKE '%@mirubato.com';

-- Add primary_instrument field for better user profiling
ALTER TABLE users ADD COLUMN primary_instrument TEXT 
  CHECK (primary_instrument IN ('PIANO', 'GUITAR', 'BOTH', NULL));

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