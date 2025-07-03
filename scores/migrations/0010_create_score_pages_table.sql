-- Create score_pages table for multi-image score support
-- This allows users to upload multiple images as pages of a single score

CREATE TABLE IF NOT EXISTS score_pages (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,  -- Full URL to access the image
  r2_key TEXT NOT NULL,     -- R2 storage key
  width INTEGER,            -- Image dimensions for layout
  height INTEGER,
  file_size_bytes INTEGER,
  mime_type TEXT CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/jpg')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(score_id, page_number)  -- Ensure unique page numbers per score
);

-- Create indexes for efficient querying
CREATE INDEX idx_score_pages_score_id ON score_pages(score_id);
CREATE INDEX idx_score_pages_page_number ON score_pages(page_number);