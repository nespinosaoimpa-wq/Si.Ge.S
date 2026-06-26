-- ============================================================
-- SPS MIGRATION - Missing Tables for Guard Book & Patrol
-- ============================================================

-- 1. Table for Guard Book Entries (Libro de Guardia)
CREATE TABLE IF NOT EXISTS guard_book_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objective_id UUID NOT NULL REFERENCES objectives(id),
    resource_id TEXT NOT NULL, -- Supporting both UUID and legacy IDs
    entry_type TEXT NOT NULL, -- incidente, emergencia, ronda, fichaje, etc
    content TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    urgency TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for Patrol Rounds (Container for a route execution)
CREATE TABLE IF NOT EXISTS patrol_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objective_id UUID NOT NULL REFERENCES objectives(id),
    resource_id TEXT NOT NULL, -- Supporting both UUID and legacy IDs
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'aborted')),
    round_start TIMESTAMPTZ DEFAULT NOW(),
    round_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE guard_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_rounds ENABLE ROW LEVEL SECURITY;

-- Policies for guard_book_entries
CREATE POLICY "allow_all_guard_book" ON guard_book_entries FOR ALL USING (true);
-- Policies for patrol_rounds
CREATE POLICY "allow_all_patrol_rounds" ON patrol_rounds FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guard_book_objective ON guard_book_entries(objective_id);
CREATE INDEX IF NOT EXISTS idx_patrol_rounds_objective ON patrol_rounds(objective_id);
