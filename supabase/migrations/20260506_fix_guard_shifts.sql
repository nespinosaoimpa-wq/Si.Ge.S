-- ============================================================
-- Migración: Fix guard_shifts FK constraint + normalizar status
-- EJECUTAR EN SUPABASE SQL EDITOR ANTES DE DEPLOYAR
-- ============================================================

-- 1. Eliminar el FK problemático que bloquea check-ins
--    Este constraint apunta a users(id) o auth.users(id), pero operator_id
--    almacena IDs de resources (ej: 'S-701') que no existen en esas tablas.
ALTER TABLE public.guard_shifts 
  DROP CONSTRAINT IF EXISTS guard_shifts_operator_id_fkey;

-- También eliminar cualquier otro FK residual sobre operator_id
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.guard_shifts'::regclass
      AND contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.guard_shifts'::regclass
          AND attname = 'operator_id'
          AND attnum = ANY(conkey)
      )
  LOOP
    EXECUTE format('ALTER TABLE public.guard_shifts DROP CONSTRAINT IF EXISTS %I', _constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', _constraint_name;
  END LOOP;
END $$;

-- 2. Normalizar status: convertir 'active' → 'activo' en todos los registros
UPDATE public.guard_shifts SET status = 'activo' WHERE status = 'active';

-- 3. Cambiar el valor default de la columna status a 'activo'
ALTER TABLE public.guard_shifts 
  ALTER COLUMN status SET DEFAULT 'activo';

-- 4. Asegurar que guard_shifts esté en la publicación Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'guard_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_shifts;
  END IF;
END $$;

-- 5. Verificación: listar constraints restantes (informativo)
DO $$
DECLARE
  _row RECORD;
BEGIN
  RAISE NOTICE '--- Constraints activos en guard_shifts ---';
  FOR _row IN
    SELECT conname, contype FROM pg_constraint
    WHERE conrelid = 'public.guard_shifts'::regclass
  LOOP
    RAISE NOTICE 'Constraint: % (type: %)', _row.conname, _row.contype;
  END LOOP;
END $$;
