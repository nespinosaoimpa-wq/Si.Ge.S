-- ==============================================================================
-- MIGRATION: 20261005_fix_missing_operator_name_columns.sql
-- DESCRIPCIÓN: Consolidación idempotente de columna operator_name en guard_book_entries y alarms
--              Garantiza compatibilidad total con la app sin breaking changes.
-- ==============================================================================

-- 1. TABLA GUARD_BOOK_ENTRIES
ALTER TABLE public.guard_book_entries
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS resource_id TEXT;

-- 2. TABLA ALARMS
ALTER TABLE public.alarms
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS operator_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS operator_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS objective_name TEXT;

-- 3. ACTUALIZAR REPLICA IDENTITY FULL
ALTER TABLE public.guard_book_entries REPLICA IDENTITY FULL;
ALTER TABLE public.alarms REPLICA IDENTITY FULL;
