-- Add columns for PDF text extraction (issue #676)
-- These columns store extracted text content and metadata from PDFs

-- Add extracted_text column to store text content from PDFs
ALTER TABLE score_versions ADD COLUMN extracted_text TEXT;

-- Add pdf_metadata column to store PDF document metadata (title, author, etc.)
ALTER TABLE score_versions ADD COLUMN pdf_metadata TEXT;

-- Add text_extraction_status column to track extraction progress
-- Values: pending, completed, failed, no_text (for image-only PDFs)
ALTER TABLE score_versions ADD COLUMN text_extraction_status TEXT
  CHECK (text_extraction_status IN ('pending', 'completed', 'failed', 'no_text'));

-- Add updated_at column if it doesn't exist
ALTER TABLE score_versions ADD COLUMN updated_at DATETIME;

-- Create index for text extraction status queries
CREATE INDEX IF NOT EXISTS idx_score_versions_text_extraction_status
  ON score_versions(text_extraction_status);

-- Set default status for existing records
UPDATE score_versions
SET text_extraction_status = 'pending'
WHERE format = 'pdf' AND text_extraction_status IS NULL;
