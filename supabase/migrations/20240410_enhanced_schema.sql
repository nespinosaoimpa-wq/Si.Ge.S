-- 1. Expand Resources Table for Deep Profiling
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS hiring_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS psych_expiry DATE,
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS training_expiry DATE,
ADD COLUMN IF NOT EXISTS performance_data JSONB DEFAULT '[{"month": "Enero", "hours": 160, "incidents": 0, "punctuality": 100}]'::jsonb,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT;

-- 2. Expand Objectives Table for Logistics
ALTER TABLE public.objectives
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Seed some "Real" Data for Demonstration
-- Update existing resources if any, or insert new ones for testing
INSERT INTO public.resources (id, name, role, status, latitude, longitude, phone, email, hiring_date, salary, psych_expiry, license_expiry, performance_data)
VALUES 
('S-701', 'Carlos Méndez', 'Vigilante Principal', 'active', -31.6107, -60.6973, '+54 342 555-0123', 'c.mendez@sps.com', '2024-01-12', '$840.000', '2026-10-12', '2027-03-05', 
 '[{"month": "Enero", "hours": 168, "incidents": 0, "punctuality": 98}, {"month": "Febrero", "hours": 172, "incidents": 1, "punctuality": 95}, {"month": "Marzo", "hours": 160, "incidents": 0, "punctuality": 99}]'::jsonb),
('S-702', 'Marta Ruiz', 'Supervisora de Zona', 'active', -31.6200, -60.7000, '+54 342 555-0124', 'm.ruiz@sps.com', '2023-11-20', '$920.000', '2025-12-01', '2024-06-15',
 '[{"month": "Enero", "hours": 180, "incidents": 0, "punctuality": 100}, {"month": "Febrero", "hours": 184, "incidents": 0, "punctuality": 98}, {"month": "Marzo", "hours": 170, "incidents": 2, "punctuality": 92}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  performance_data = EXCLUDED.performance_data;
