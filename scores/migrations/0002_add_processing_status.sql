-- Add processing status to scores table for tracking PDF rendering progress
ALTER TABLE scores 
ADD COLUMN processing_status TEXT DEFAULT 'pending' 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE scores 
ADD COLUMN processing_error TEXT;