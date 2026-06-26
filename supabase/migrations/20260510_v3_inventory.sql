-- ============================================================
-- Migración v3.0: Módulo de Inventario y Stock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'linterna', 'celular', 'detector_metales', 'camara_seguridad', 'reflector', 'otros'
  serial_number TEXT,
  condition TEXT DEFAULT 'operativo', -- 'operativo', 'roto', 'mantenimiento', 'baja', 'faltante'
  assigned_to_objective TEXT REFERENCES public.objectives(id) ON DELETE SET NULL,
  assigned_to_resource TEXT, -- ID del operador responsable (opcional)
  notes TEXT,
  purchase_date DATE,
  last_inspection DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id TEXT NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL, -- operador que reporta
  shift_id UUID REFERENCES public.guard_shifts(id) ON DELETE SET NULL,
  items JSONB NOT NULL, -- [{item_id, condition, notes}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_objective ON public.inventory_items(assigned_to_objective);
CREATE INDEX IF NOT EXISTS idx_inventory_handoffs_objective ON public.inventory_handoffs(objective_id);

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
