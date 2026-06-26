-- ============================================================
-- Migración: Reparación de Esquema de Inventario
-- Fecha: 2026-05-16
-- Problema: La tabla resource_inventory no tenía las columnas
--           category, notes ni condición correcta de estados.
-- ============================================================

-- 1. Agregar columna 'category' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'otros';

-- 2. Agregar columna 'notes' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Agregar columna 'updated_at' si no existe
ALTER TABLE public.resource_inventory
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Eliminar el CHECK constraint antiguo y reemplazarlo por uno flexible
--    que acepta los mismos valores que usa el frontend (minúsculas)
ALTER TABLE public.resource_inventory
  DROP CONSTRAINT IF EXISTS resource_inventory_status_check;

ALTER TABLE public.resource_inventory
  ADD CONSTRAINT resource_inventory_status_check
  CHECK (status IN ('operativo', 'mantenimiento', 'roto', 'faltante', 'Operativo', 'Dañado', 'Faltante'));

-- 5. Normalizar los datos existentes a minúsculas para consistencia
UPDATE public.resource_inventory SET status = 'operativo' WHERE status = 'Operativo';
UPDATE public.resource_inventory SET status = 'roto'       WHERE status = 'Dañado';
UPDATE public.resource_inventory SET status = 'faltante'   WHERE status = 'Faltante';

-- 6. Ahora que los datos están normalizados, reemplazar el CHECK por solo minúsculas
ALTER TABLE public.resource_inventory
  DROP CONSTRAINT IF EXISTS resource_inventory_status_check;

ALTER TABLE public.resource_inventory
  ADD CONSTRAINT resource_inventory_status_check
  CHECK (status IN ('operativo', 'mantenimiento', 'roto', 'faltante'));

-- 7. Índice por categoría para el panel de resumen por rubro
CREATE INDEX IF NOT EXISTS idx_resource_inventory_category ON public.resource_inventory(category);

-- 8. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
