-- ================================================================
-- SIGPAD — DIAGNÓSTICO COMPLETO DE SALUD DE BASE DE DATOS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 1: INVENTARIO DE TABLAS Y TAMAÑO
-- ────────────────────────────────────────────────────────────────
SELECT
  '📋 TABLAS' AS seccion,
  schemaname,
  tablename AS tabla,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamanio_total,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS tamanio_datos,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = schemaname AND table_name = tablename) AS columnas
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 2: CONTEO DE FILAS POR TABLA (las más importantes)
-- ────────────────────────────────────────────────────────────────
SELECT '📊 CONTEO DE FILAS' AS seccion, 'resources' AS tabla, COUNT(*) AS filas FROM public.resources
UNION ALL SELECT '📊 CONTEO DE FILAS', 'objectives', COUNT(*) FROM public.objectives
UNION ALL SELECT '📊 CONTEO DE FILAS', 'guard_shifts', COUNT(*) FROM public.guard_shifts
UNION ALL SELECT '📊 CONTEO DE FILAS', 'guard_book_entries', COUNT(*) FROM public.guard_book_entries
UNION ALL SELECT '📊 CONTEO DE FILAS', 'alarms', COUNT(*) FROM public.alarms
UNION ALL SELECT '📊 CONTEO DE FILAS', 'authorized_users', COUNT(*) FROM public.authorized_users
UNION ALL SELECT '📊 CONTEO DE FILAS', 'notifications', COUNT(*) FROM public.notifications
UNION ALL SELECT '📊 CONTEO DE FILAS', 'gps_tracking', COUNT(*) FROM public.gps_tracking
UNION ALL SELECT '📊 CONTEO DE FILAS', 'tracking_logs', COUNT(*) FROM public.tracking_logs
UNION ALL SELECT '📊 CONTEO DE FILAS', 'incidents', COUNT(*) FROM public.incidents
UNION ALL SELECT '📊 CONTEO DE FILAS', 'patrol_rounds', COUNT(*) FROM public.patrol_rounds
UNION ALL SELECT '📊 CONTEO DE FILAS', 'checkpoints', COUNT(*) FROM public.checkpoints
UNION ALL SELECT '📊 CONTEO DE FILAS', 'inventory_items', COUNT(*) FROM public.inventory_items
UNION ALL SELECT '📊 CONTEO DE FILAS', 'users', COUNT(*) FROM public.users
UNION ALL SELECT '📊 CONTEO DE FILAS', 'tenants', COUNT(*) FROM public.tenants
ORDER BY filas DESC;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 3: ESTADO DE RLS (Row Level Security) POR TABLA
-- ────────────────────────────────────────────────────────────────
SELECT
  '🔒 SEGURIDAD RLS' AS seccion,
  tablename AS tabla,
  CASE WHEN rowsecurity THEN '✅ RLS Activo' ELSE '❌ RLS INACTIVO (RIESGO)' END AS estado_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = pt.tablename AND schemaname = 'public') AS politicas
FROM pg_tables pt
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 4: POLÍTICAS RLS ABIERTAS (PELIGROSAS)
-- Detecta tablas con política FOR ALL USING (true) → acceso total sin auth
-- ────────────────────────────────────────────────────────────────
SELECT
  '⚠️ POLITICAS ABIERTAS' AS seccion,
  tablename AS tabla,
  policyname AS politica,
  cmd AS operacion,
  qual AS condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual IS NULL OR qual = '(true)')
ORDER BY tablename;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 5: REALTIME — TABLAS EN PUBLICACIÓN
-- ────────────────────────────────────────────────────────────────
SELECT
  '⚡ REALTIME' AS seccion,
  tablename AS tabla,
  '✅ En supabase_realtime' AS estado
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 6: ÍNDICES EXISTENTES
-- ────────────────────────────────────────────────────────────────
SELECT
  '🔍 ÍNDICES' AS seccion,
  tablename AS tabla,
  indexname AS indice,
  indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 7: SALUD DE TURNOS ACTIVOS (guard_shifts)
-- ────────────────────────────────────────────────────────────────
SELECT
  '🟢 TURNOS ACTIVOS' AS seccion,
  gs.id,
  gs.operator_id,
  r.name AS operador,
  o.name AS objetivo,
  gs.checkin_time,
  gs.status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - gs.checkin_time))/3600, 2) AS horas_activo
FROM public.guard_shifts gs
LEFT JOIN public.resources r ON r.id = gs.operator_id
LEFT JOIN public.objectives o ON o.id = gs.objective_id
WHERE gs.status IN ('activo', 'active')
ORDER BY gs.checkin_time DESC
LIMIT 20;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 8: ALARMAS ACTIVAS (sin resolver)
-- ────────────────────────────────────────────────────────────────
SELECT
  '🚨 ALARMAS SIN RESOLVER' AS seccion,
  id,
  triggered_by,
  alarm_type,
  message,
  status,
  created_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60) AS minutos_sin_resolver
FROM public.alarms
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 9: DATOS HUÉRFANOS / INCONSISTENCIAS
-- Turnos sin checkout hace más de 24h (posibles zombies)
-- ────────────────────────────────────────────────────────────────
SELECT
  '🧟 TURNOS ZOMBIE (sin checkout +24h)' AS seccion,
  gs.id,
  gs.operator_id,
  r.name AS operador,
  gs.checkin_time,
  gs.status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - gs.checkin_time))/3600, 1) AS horas_abierto
FROM public.guard_shifts gs
LEFT JOIN public.resources r ON r.id = gs.operator_id
WHERE gs.checkout_time IS NULL
  AND gs.status IN ('activo', 'active')
  AND gs.checkin_time < NOW() - INTERVAL '24 hours'
ORDER BY gs.checkin_time ASC;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 10: ENTRADAS GUARD_BOOK RECIENTES (últimas 24h)
-- ────────────────────────────────────────────────────────────────
SELECT
  '📖 NOVEDADES (últimas 24h)' AS seccion,
  gbe.id,
  gbe.entry_type,
  gbe.urgency,
  gbe.content,
  gbe.created_at,
  gbe.tenant_id
FROM public.guard_book_entries gbe
WHERE gbe.created_at > NOW() - INTERVAL '24 hours'
ORDER BY gbe.created_at DESC
LIMIT 20;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 11: USUARIOS AUTORIZADOS POR ESTADO
-- ────────────────────────────────────────────────────────────────
SELECT
  '👥 USUARIOS AUTORIZADOS' AS seccion,
  status AS estado,
  role AS rol,
  COUNT(*) AS cantidad
FROM public.authorized_users
GROUP BY status, role
ORDER BY status, role;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 12: TENANTS (multi-empresa)
-- ────────────────────────────────────────────────────────────────
SELECT
  '🏢 TENANTS' AS seccion,
  t.id,
  t.name AS empresa,
  t.status,
  (SELECT COUNT(*) FROM public.resources WHERE tenant_id = t.id) AS empleados,
  (SELECT COUNT(*) FROM public.objectives WHERE tenant_id = t.id) AS objetivos,
  (SELECT COUNT(*) FROM public.guard_shifts WHERE tenant_id = t.id) AS turnos_totales
FROM public.tenants t
ORDER BY t.name;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 13: FUNCIONES RPC EXISTENTES
-- ────────────────────────────────────────────────────────────────
SELECT
  '⚙️ FUNCIONES RPC' AS seccion,
  routine_name AS funcion,
  routine_type AS tipo,
  data_type AS retorna
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ────────────────────────────────────────────────────────────────
-- BLOQUE 14: COLUMNAS CON TENANT_ID (verificar multitenancy)
-- ────────────────────────────────────────────────────────────────
SELECT
  '🏷️ COBERTURA TENANT_ID' AS seccion,
  table_name AS tabla,
  '✅ Tiene tenant_id' AS estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
ORDER BY table_name;
