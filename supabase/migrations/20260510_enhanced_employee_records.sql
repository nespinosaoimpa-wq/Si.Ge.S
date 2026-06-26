-- ============================================================
-- Migración: Ficha Personal Extendida
-- Agrega campos para talles, credenciales, sanciones y legajo digital.
-- ============================================================

ALTER TABLE public.resources 
  -- Talles y Uniforme
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS pants_size TEXT,
  ADD COLUMN IF NOT EXISTS boot_size TEXT,
  ADD COLUMN IF NOT EXISTS last_uniform_delivery DATE,
  
  -- Credenciales y Seguridad
  ADD COLUMN IF NOT EXISTS credential_number TEXT,
  ADD COLUMN IF NOT EXISTS credential_expiry DATE,
  
  -- Legajo Digital (JSONB para flexibilidad)
  ADD COLUMN IF NOT EXISTS sanctions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS leaves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Comentarios para documentación
COMMENT ON COLUMN public.resources.sanctions IS 'Historial de sanciones: [{date, reason, severity, signed_url}]';
COMMENT ON COLUMN public.resources.medical_records IS 'Carpetas médicas y artículos: [{date, type, duration, doctor, diagnosis}]';
COMMENT ON COLUMN public.resources.documents IS 'Documentos adjuntos: [{name, url, uploaded_at}]';
