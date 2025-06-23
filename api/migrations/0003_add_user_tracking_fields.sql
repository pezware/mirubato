-- Add tracking fields to users table
-- These help with debugging and user analytics

-- Add last_login_at field
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

-- Add login_count field with default value
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;

-- Update existing users to have login_count = 0
UPDATE users SET login_count = 0 WHERE login_count IS NULL;

-- Create index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email);

-- Create index for auth provider lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);