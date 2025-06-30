-- Ensure all necessary indexes exist for PDF rendering feature

-- Create index for performance on processing_status
CREATE INDEX IF NOT EXISTS idx_scores_processing_status ON scores(processing_status);

-- Create index for score analytics
CREATE INDEX IF NOT EXISTS idx_score_analytics_last_viewed ON score_analytics(last_viewed_at);

-- Update any NULL processing_status to 'pending'
UPDATE scores 
SET processing_status = 'pending' 
WHERE processing_status IS NULL;

-- Ensure score_analytics entries exist for all scores
INSERT OR IGNORE INTO score_analytics (score_id, view_count, download_count, render_count)
SELECT id, 0, 0, 0 FROM scores
WHERE id NOT IN (SELECT score_id FROM score_analytics);