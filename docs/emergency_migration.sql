-- ============================================================
-- SPS EMERGENCY & COMMUNICATION MIGRATION
-- ============================================================

-- 1. Extend guard_book_entries for emergency resolution
ALTER TABLE guard_book_entries ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;
ALTER TABLE guard_book_entries ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES resources(id);
ALTER TABLE guard_book_entries ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- 2. Table for real-time notifications/commands (bidirectional)
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id TEXT NOT NULL, -- UUID for resources or 'system'
    receiver_id TEXT NOT NULL, -- UUID for specific resource or 'all_managers'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, emergency, command
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "allow_all_notifications" ON system_notifications FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_receiver ON system_notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON system_notifications(is_read);
