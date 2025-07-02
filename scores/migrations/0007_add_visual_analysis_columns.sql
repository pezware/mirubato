-- Add columns for Cloudflare AI visual analysis results
ALTER TABLE scores ADD COLUMN visual_analysis TEXT;
ALTER TABLE scores ADD COLUMN visual_confidence REAL;