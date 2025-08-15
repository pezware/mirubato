-- Migration: Remove API keys table
-- Description: Remove API key authentication infrastructure as we're moving to JWT-only authentication
-- Date: 2025-07-13

-- Drop the api_keys table and its indexes
DROP TABLE IF EXISTS api_keys;

-- Drop api_usage table if it exists (was used for API key usage tracking)
DROP TABLE IF EXISTS api_usage;

-- Note: This migration removes all API key related data permanently.
-- Ensure all clients have migrated to JWT authentication before running this migration.