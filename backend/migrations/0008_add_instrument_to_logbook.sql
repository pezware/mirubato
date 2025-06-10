-- Add instrument column to logbook_entries table
ALTER TABLE logbook_entries 
ADD COLUMN instrument TEXT NOT NULL DEFAULT 'PIANO' 
CHECK (instrument IN ('PIANO', 'GUITAR'));

-- Create index for instrument filtering
CREATE INDEX idx_logbook_instrument ON logbook_entries(instrument);

-- Update existing entries to use user's primary instrument if available
UPDATE logbook_entries 
SET instrument = (
  SELECT u.primary_instrument 
  FROM users u 
  WHERE u.id = logbook_entries.user_id
)
WHERE EXISTS (
  SELECT 1 
  FROM users u 
  WHERE u.id = logbook_entries.user_id
);