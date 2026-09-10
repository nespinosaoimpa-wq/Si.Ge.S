-- Migration: Add missing columns and tables to match frontend application features
-- Date: 2026-09-07

-- 1. Add missing columns to objectives table if they do not exist
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Activo',
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 150;

-- 2. Create shift_requirements table if missing
CREATE TABLE IF NOT EXISTS public.shift_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    objective_id TEXT REFERENCES public.objectives(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    required_role TEXT DEFAULT 'vigilador',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add resource_id to guard_book_entries for backward compatibility
ALTER TABLE public.guard_book_entries 
ADD COLUMN IF NOT EXISTS resource_id TEXT;

