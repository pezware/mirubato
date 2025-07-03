-- Add columns for Cloudflare AI visual analysis results
-- Note: These may fail if columns already exist, which is expected
ALTER TABLE scores ADD COLUMN visual_analysis TEXT;
ALTER TABLE scores ADD COLUMN visual_confidence REAL;