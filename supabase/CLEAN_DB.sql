-- ============================================================
-- Si.Ge.S — CLEANUP SCRIPT: Wipe Demo Seed Data
-- Ejecutar en Supabase SQL Editor para vaciar los datos demo
-- y comenzar con una base de datos limpia para uso profesional.
-- ============================================================

-- 1. Vaciar tablas de transacciones y logs
TRUNCATE TABLE public.gps_tracking CASCADE;
TRUNCATE TABLE public.patrol_track_points CASCADE;
TRUNCATE TABLE public.patrol_trace CASCADE;
TRUNCATE TABLE public.patrol_checkpoint_logs CASCADE;
TRUNCATE TABLE public.patrol_rounds CASCADE;
TRUNCATE TABLE public.guard_book_entries CASCADE;
TRUNCATE TABLE public.guard_shifts CASCADE;
TRUNCATE TABLE public.alarms CASCADE;
TRUNCATE TABLE public.geofence_alerts CASCADE;
TRUNCATE TABLE public.inventory_handoffs CASCADE;
TRUNCATE TABLE public.patrol_rounds_audit CASCADE;

-- 2. Vaciar tablas principales
TRUNCATE TABLE public.contracts CASCADE;
TRUNCATE TABLE public.inventory_items CASCADE;
TRUNCATE TABLE public.checkpoints CASCADE;
TRUNCATE TABLE public.objective_zones CASCADE;

-- 3. Limpiar recursos y objetivos (manteniendo usuarios autorizados para no perder acceso)
DELETE FROM public.resources WHERE id IN ('S-701', 'S-702', 'S-703', 'S-704');
DELETE FROM public.objectives WHERE id IN ('OBJ-001', 'OBJ-002', 'OBJ-003');

-- Opcional: Si querés vaciar también la whitelist de correos autorizados
-- (Cuidado: esto quitará el acceso rápido hasta que agregues nuevos correos)
-- DELETE FROM public.authorized_users WHERE email NOT IN ('nespinosa.oimpa@gmail.com', 'jugador.nico55@gmail.com');

NOTIFY pgrst, 'reload schema';
