-- ============================================================
-- SPS 704 OS — Production Hardening Migration
-- Fecha: 2026-05-13
-- ============================================================

-- 1. TARIFAS DINÁMICAS
-- Agrega hourly_pay_rate a la tabla resources (tarifa de nómina por operador)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS hourly_pay_rate NUMERIC(10, 2) DEFAULT 3500.00;

-- Agrega hourly_billing_rate a la tabla objectives (tarifa de facturación al cliente)
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS hourly_billing_rate NUMERIC(10, 2) DEFAULT 4500.00;

-- 2. BAJA LÓGICA DE PERSONAL
-- La columna status ya debería existir, pero aseguramos el valor 'baja'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='resources' AND column_name='status'
  ) THEN
    ALTER TABLE resources ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 3. MULTIMEDIA EN GUARD BOOK
-- Agrega columnas de URLs de multimedia a guard_book_entries
ALTER TABLE guard_book_entries
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 4. CAMPOS DE LEGAJO COMPLETO EN RESOURCES
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT;

-- credential_number y credential_expiry ya deberían existir, pero aseguramos:
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE;

-- ============================================================
-- 5. SUPABASE STORAGE — Bucket novedades-media
-- EJECUTAR MANUALMENTE en Supabase Dashboard → SQL Editor
-- (los buckets no se crean via SQL estándar en migraciones,
--  se crean via Storage API o Dashboard)
-- ============================================================

-- Insertar el bucket vía la tabla interna de storage (método alternativo):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novedades-media',
  'novedades-media',
  true,
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. RLS POLICIES — Storage bucket novedades-media
-- ============================================================

-- Lectura pública (cualquiera puede ver las fotos de novedades)
CREATE POLICY "novedades_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'novedades-media');

-- Solo usuarios autenticados pueden subir
CREATE POLICY "novedades_media_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'novedades-media');

-- Solo el propietario o el service role puede eliminar
CREATE POLICY "novedades_media_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'novedades-media' AND auth.uid()::text = owner);

-- ============================================================
-- 7. RLS POLICIES — guard_book_entries (asegurar que image_url
--    y audio_url sean accesibles para lectura por todos los roles)
-- ============================================================

-- Habilitar RLS si no estaba habilitado
ALTER TABLE guard_book_entries ENABLE ROW LEVEL SECURITY;

-- Policy de lectura para autenticados (gerentes y operadores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guard_book_entries' AND policyname = 'guard_book_authenticated_read'
  ) THEN
    CREATE POLICY "guard_book_authenticated_read"
    ON guard_book_entries FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Policy de inserción para autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guard_book_entries' AND policyname = 'guard_book_authenticated_insert'
  ) THEN
    CREATE POLICY "guard_book_authenticated_insert"
    ON guard_book_entries FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 8. ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_credential_expiry ON resources(credential_expiry);
CREATE INDEX IF NOT EXISTS idx_guard_book_objective ON guard_book_entries(objective_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_resource ON guard_shifts(resource_id, check_in DESC);
