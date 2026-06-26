
-- Add status and resolution tracking to guard book entries
ALTER TABLE guard_book_entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE guard_book_entries 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE guard_book_entries 
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Update existing entries to active
UPDATE guard_book_entries SET status = 'active' WHERE status IS NULL;
