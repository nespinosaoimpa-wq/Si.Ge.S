-- Migration: Inventory System for Objectives & Operators

CREATE TABLE IF NOT EXISTS public.resource_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  serial_number TEXT,
  status TEXT DEFAULT 'Operativo' CHECK (status IN ('Operativo', 'Dañado', 'Faltante')),
  assigned_to UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.resource_inventory ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (managers and operators)
CREATE POLICY "Full access inventory" ON public.resource_inventory
  FOR ALL USING (true) WITH CHECK (true);

-- Insert demo data
INSERT INTO public.resource_inventory (objective_id, item_name, serial_number, status)
SELECT id, 'Radio Handie Motorola', 'MT-8842', 'Operativo' FROM public.objectives LIMIT 3;

INSERT INTO public.resource_inventory (objective_id, item_name, serial_number, status)
SELECT id, 'Chaleco Antibala RB3', 'CH-9912', 'Operativo' FROM public.objectives LIMIT 3;
