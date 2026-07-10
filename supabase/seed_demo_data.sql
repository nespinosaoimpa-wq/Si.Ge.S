-- ═══════════════════════════════════════════════════════════════════════
-- SIGPAD SaaS — Datos de Demostración Profesional
-- ⚠️  EJECUTAR SOLO EN ENTORNO DE DEMO / PRESENTACIONES COMERCIALES
-- ⚠️  NO ejecutar en producción real con clientes
--
-- Genera:
--   • 3 empresas de seguridad argentinas realistas
--   • 8 operadores/guardias por empresa (con datos reales)
--   • 4 objetivos por empresa (con coordenadas reales de Argentina)
--   • Turnos activos e históricos
--   • Alarmas de pánico y de intrusión
--   • Eventos de billing (trial, pago exitoso, pago fallido)
--
-- Cómo usar:
--   1. Ejecutar primero FRESH_START.sql
--   2. Ejecutar saas_multitenant_migration.sql
--   3. Ejecutar este script
--   4. Verificar en /superadmin que aparezcan las 3 empresas
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- PASO 1: CREAR 3 EMPRESAS (TENANTS)
-- ─────────────────────────────────────────────────────────────

-- Empresa 1: Cliente activo con plan Professional
INSERT INTO public.tenants (
  id, name, slug, country_code,
  billing_status, plan_tier,
  trial_ends_at, admin_email,
  phone, tax_id, address,
  max_operators, max_objectives, is_active
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Seguridad Norte S.A.',
  'seguridad-norte',
  'ar',
  'active', 'professional',
  now() + INTERVAL '365 days',
  'admin@seguridadnorte.com.ar',
  '+54 11 4823-9900',
  '30-71234567-9',
  'Av. Corrientes 2450, CABA, Argentina',
  50, 20, true
) ON CONFLICT (slug) DO NOTHING;

-- Empresa 2: Cliente en trial (demostración de período de prueba)
INSERT INTO public.tenants (
  id, name, slug, country_code,
  billing_status, plan_tier,
  trial_ends_at, admin_email,
  phone, tax_id, address,
  max_operators, max_objectives, is_active
) VALUES (
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Vigilancia Patagonia SRL',
  'vigilancia-patagonia',
  'ar',
  'trial', 'starter',
  now() + INTERVAL '7 days',
  'gerencia@vigilanciapatagonia.ar',
  '+54 299 448-7700',
  '30-68900123-6',
  'Ruta Nacional 22, Km 1200, Neuquén, Argentina',
  20, 10, true
) ON CONFLICT (slug) DO NOTHING;

-- Empresa 3: Cliente Enterprise (México)
INSERT INTO public.tenants (
  id, name, slug, country_code,
  billing_status, plan_tier,
  trial_ends_at, admin_email,
  phone, tax_id, address,
  max_operators, max_objectives, is_active
) VALUES (
  'a1b2c3d4-0003-0003-0003-000000000003',
  'SecureForce México S.A. de C.V.',
  'secureforce-mexico',
  'mx',
  'active', 'enterprise',
  now() + INTERVAL '365 days',
  'cto@secureforce.mx',
  '+52 55 5678-9900',
  'MX-RFC-SFMX0001AAA',
  'Av. Insurgentes Sur 1458, Benito Juárez, CDMX',
  200, 80, true
) ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PASO 2: OBJETIVOS (PUESTOS DE GUARDIA) — Con coordenadas reales
-- ─────────────────────────────────────────────────────────────

-- ── Empresa 1: Seguridad Norte S.A. (CABA / GBA) ────────────
INSERT INTO public.objectives (id, name, address, client_name, contact_phone,
  latitude, longitude, geofence_radius, is_active, hourly_billing_rate, tenant_id)
VALUES
  ('obj-norte-001', 'Supermercado Cencosud — Palermo',
   'Av. Santa Fe 3253, Palermo, CABA', 'Cencosud S.A.', '+54 11 5555-0001',
   -34.5872, -58.4097, 150.0, true, 5200.00,
   'a1b2c3d4-0001-0001-0001-000000000001'),

  ('obj-norte-002', 'Banco Galicia — Microcentro',
   'San Martín 407, Microcentro, CABA', 'Banco Galicia', '+54 11 5555-0002',
   -34.6024, -58.3756, 100.0, true, 7800.00,
   'a1b2c3d4-0001-0001-0001-000000000001'),

  ('obj-norte-003', 'Planta Industrial — Avellaneda',
   'Av. Mitre 2800, Avellaneda, Buenos Aires', 'Metalúrgica del Sur', '+54 11 5555-0003',
   -34.6637, -58.3697, 300.0, true, 6100.00,
   'a1b2c3d4-0001-0001-0001-000000000001'),

  ('obj-norte-004', 'Shopping Alto Palermo',
   'Av. Santa Fe 3253, Palermo, CABA', 'IRSA Commercial Properties', '+54 11 5555-0004',
   -34.5884, -58.4108, 250.0, true, 5500.00,
   'a1b2c3d4-0001-0001-0001-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Empresa 2: Vigilancia Patagonia (Neuquén / Río Negro) ────
INSERT INTO public.objectives (id, name, address, client_name, contact_phone,
  latitude, longitude, geofence_radius, is_active, hourly_billing_rate, tenant_id)
VALUES
  ('obj-pata-001', 'Terminal de Ómnibus Neuquén',
   'Av. Ing. Huergo 420, Neuquén Capital', 'Municipalidad Neuquén', '+54 299 111-0001',
   -38.9536, -68.0591, 200.0, true, 4200.00,
   'a1b2c3d4-0002-0002-0002-000000000002'),

  ('obj-pata-002', 'Supermercado La Anónima — Cipolletti',
   'Av. Roca 250, Cipolletti, Río Negro', 'La Anónima', '+54 299 111-0002',
   -38.9325, -67.9937, 120.0, true, 3800.00,
   'a1b2c3d4-0002-0002-0002-000000000002'),

  ('obj-pata-003', 'Hospital Castro Rendón',
   'Buenos Aires 450, Neuquén Capital', 'Provincia de Neuquén', '+54 299 111-0003',
   -38.9523, -68.0532, 180.0, true, 4600.00,
   'a1b2c3d4-0002-0002-0002-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ── Empresa 3: SecureForce México (CDMX) ────────────────────
INSERT INTO public.objectives (id, name, address, client_name, contact_phone,
  latitude, longitude, geofence_radius, is_active, hourly_billing_rate, tenant_id)
VALUES
  ('obj-mx-001', 'Torre Reforma — Piso 12-18',
   'Paseo de la Reforma 483, Cuauhtémoc, CDMX', 'Grupo Financiero Reforma', '+52 55 9999-0001',
   19.4276, -99.1679, 100.0, true, 12000.00,
   'a1b2c3d4-0003-0003-0003-000000000003'),

  ('obj-mx-002', 'Walmart Insurgentes',
   'Av. Insurgentes Sur 1602, Benito Juárez, CDMX', 'Walmart de México', '+52 55 9999-0002',
   19.3747, -99.1770, 200.0, true, 9500.00,
   'a1b2c3d4-0003-0003-0003-000000000003'),

  ('obj-mx-003', 'Centro Comercial Perisur',
   'Periférico Sur 4690, Insurgentes Cuicuilco, CDMX', 'Grupo Perisur', '+52 55 9999-0003',
   19.3075, -99.1785, 350.0, true, 11000.00,
   'a1b2c3d4-0003-0003-0003-000000000003'),

  ('obj-mx-004', 'Aeropuerto AICM — Zona de Carga',
   'Capitán Carlos León s/n, Venustiano Carranza, CDMX', 'AICM', '+52 55 9999-0004',
   19.4361, -99.0719, 500.0, true, 15000.00,
   'a1b2c3d4-0003-0003-0003-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PASO 3: RECURSOS (GUARDIAS / OPERADORES)
-- ─────────────────────────────────────────────────────────────

-- ── Empresa 1: Seguridad Norte S.A. ─────────────────────────
INSERT INTO public.resources (
  id, name, role, status, phone, email, dni,
  hiring_date, hourly_pay_rate,
  latitude, longitude, last_gps_update,
  credential_number, credential_expiry,
  assigned_to, tenant_id
) VALUES
  ('S-N001', 'Carlos Alberto Méndez',    'Supervisor de Turno',   'active', '+54 11 6001-0001', 'c.mendez@seguridadnorte.com.ar',   '28834521', '2022-03-01', 4200.00, -34.5872, -58.4097, now() - INTERVAL '5 minutes',  'CRED-SN-001', '2026-12-31', 'obj-norte-001', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N002', 'Laura Beatriz Fernández',  'Guardia de Seguridad',  'active', '+54 11 6001-0002', 'l.fernandez@seguridadnorte.com.ar', '32145678', '2023-01-15', 3500.00, -34.6024, -58.3756, now() - INTERVAL '8 minutes',  'CRED-SN-002', '2027-03-15', 'obj-norte-002', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N003', 'Roberto Daniel Díaz',      'Guardia de Seguridad',  'active', '+54 11 6001-0003', 'r.diaz@seguridadnorte.com.ar',     '25678901', '2021-07-20', 3500.00, -34.6637, -58.3697, now() - INTERVAL '12 minutes', 'CRED-SN-003', '2026-08-30', 'obj-norte-003', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N004', 'Marcela Elena Suárez',     'Guardia de Acceso',     'active', '+54 11 6001-0004', 'm.suarez@seguridadnorte.com.ar',   '30123456', '2023-05-10', 3500.00, -34.5884, -58.4108, now() - INTERVAL '3 minutes',  'CRED-SN-004', '2027-01-20', 'obj-norte-004', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N005', 'Diego Hernán Quiroga',     'Guardia de Seguridad',  'active', '+54 11 6001-0005', 'd.quiroga@seguridadnorte.com.ar',  '27890123', '2022-09-01', 3500.00, -34.5872, -58.4100, now() - INTERVAL '6 minutes',  'CRED-SN-005', '2026-10-15', 'obj-norte-001', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N006', 'Claudia Verónica Romero',  'Guardia de Acceso',     'active', '+54 11 6001-0006', 'c.romero@seguridadnorte.com.ar',   '31456789', '2023-11-20', 3500.00, -34.6030, -58.3760, now() - INTERVAL '15 minutes', 'CRED-SN-006', '2027-06-30', 'obj-norte-002', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N007', 'Alejandro Martín Peralta', 'Supervisor Nocturno',   'active', '+54 11 6001-0007', 'a.peralta@seguridadnorte.com.ar',  '24567890', '2021-02-15', 4000.00, -34.6640, -58.3700, now() - INTERVAL '20 minutes', 'CRED-SN-007', '2026-09-01', 'obj-norte-003', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N008', 'Natalia Sofía Gutiérrez',  'Guardia de Seguridad',  'leave',  '+54 11 6001-0008', 'n.gutierrez@seguridadnorte.com.ar', '33201456', '2024-01-08', 3500.00, NULL,      NULL,      NULL,                          'CRED-SN-008', '2027-12-01', NULL,            'a1b2c3d4-0001-0001-0001-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Empresa 2: Vigilancia Patagonia SRL ─────────────────────
INSERT INTO public.resources (
  id, name, role, status, phone, email, dni,
  hiring_date, hourly_pay_rate,
  latitude, longitude, last_gps_update,
  credential_number, credential_expiry,
  assigned_to, tenant_id
) VALUES
  ('S-P001', 'Gustavo Raúl Villagra',   'Jefe de Seguridad',    'active', '+54 299 501-0001', 'g.villagra@vpatagonia.ar',   '22987654', '2020-05-01', 5000.00, -38.9536, -68.0591, now() - INTERVAL '4 minutes',  'CRED-VP-001', '2026-11-30', 'obj-pata-001', 'a1b2c3d4-0002-0002-0002-000000000002'),
  ('S-P002', 'Silvana Karina Zapata',   'Guardia de Seguridad', 'active', '+54 299 501-0002', 's.zapata@vpatagonia.ar',     '29876543', '2022-08-15', 3200.00, -38.9325, -67.9937, now() - INTERVAL '10 minutes', 'CRED-VP-002', '2027-04-15', 'obj-pata-002', 'a1b2c3d4-0002-0002-0002-000000000002'),
  ('S-P003', 'Eduardo Fabián Leal',     'Guardia de Acceso',    'active', '+54 299 501-0003', 'e.leal@vpatagonia.ar',       '26543210', '2021-11-30', 3200.00, -38.9523, -68.0532, now() - INTERVAL '7 minutes',  'CRED-VP-003', '2026-07-20', 'obj-pata-003', 'a1b2c3d4-0002-0002-0002-000000000002'),
  ('S-P004', 'Vanesa Cristina Molina',  'Guardia de Seguridad', 'active', '+54 299 501-0004', 'v.molina@vpatagonia.ar',     '31765432', '2023-02-28', 3200.00, -38.9540, -68.0595, now() - INTERVAL '2 minutes',  'CRED-VP-004', '2027-09-10', 'obj-pata-001', 'a1b2c3d4-0002-0002-0002-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ── Empresa 3: SecureForce México ───────────────────────────
INSERT INTO public.resources (
  id, name, role, status, phone, email, dni,
  hiring_date, hourly_pay_rate,
  latitude, longitude, last_gps_update,
  credential_number, credential_expiry,
  assigned_to, tenant_id
) VALUES
  ('S-M001', 'Luis Ernesto Castillo',   'Supervisor General',   'active', '+52 55 7001-0001', 'l.castillo@secureforce.mx',  'CURP-MX-001', '2019-03-10', 9500.00, 19.4276, -99.1679, now() - INTERVAL '3 minutes',  'CRED-MX-001', '2026-12-15', 'obj-mx-001', 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M002', 'María Guadalupe Torres',  'Guardia de Acceso',    'active', '+52 55 7001-0002', 'm.torres@secureforce.mx',    'CURP-MX-002', '2021-06-20', 7800.00, 19.3747, -99.1770, now() - INTERVAL '9 minutes',  'CRED-MX-002', '2027-02-28', 'obj-mx-002', 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M003', 'Juan Pablo Hernández',    'Guardia de Seguridad', 'active', '+52 55 7001-0003', 'j.hernandez@secureforce.mx', 'CURP-MX-003', '2022-01-05', 7800.00, 19.3075, -99.1785, now() - INTERVAL '5 minutes',  'CRED-MX-003', '2026-09-30', 'obj-mx-003', 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M004', 'Ana Sofía Ramírez',       'Guardia de Acceso',    'active', '+52 55 7001-0004', 'a.ramirez@secureforce.mx',   'CURP-MX-004', '2023-04-12', 7800.00, 19.4361, -99.0719, now() - INTERVAL '11 minutes', 'CRED-MX-004', '2027-07-15', 'obj-mx-004', 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M005', 'Carlos Enrique Vargas',   'Guardia Perimetral',   'active', '+52 55 7001-0005', 'c.vargas@secureforce.mx',    'CURP-MX-005', '2022-09-18', 7800.00, 19.4278, -99.1681, now() - INTERVAL '14 minutes', 'CRED-MX-005', '2026-11-01', 'obj-mx-001', 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M006', 'Patricia Elena Moreno',   'Supervisora de Turno', 'active', '+52 55 7001-0006', 'p.moreno@secureforce.mx',    'CURP-MX-006', '2020-11-25', 8500.00, 19.3748, -99.1769, now() - INTERVAL '18 minutes', 'CRED-MX-006', '2027-05-20', 'obj-mx-002', 'a1b2c3d4-0003-0003-0003-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PASO 4: TURNOS ACTIVOS (guard_shifts)
-- ─────────────────────────────────────────────────────────────

-- Empresa 1 — Turnos activos hoy
INSERT INTO public.guard_shifts (operator_id, objective_id, checkin_time, status,
  checkin_latitude, checkin_longitude, checkin_within_geofence, tenant_id)
VALUES
  ('S-N001', 'obj-norte-001', now() - INTERVAL '3 hours', 'activo', -34.5872, -58.4097, true, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N002', 'obj-norte-002', now() - INTERVAL '4 hours', 'activo', -34.6024, -58.3756, true, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N003', 'obj-norte-003', now() - INTERVAL '2 hours', 'activo', -34.6637, -58.3697, true, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N004', 'obj-norte-004', now() - INTERVAL '5 hours', 'activo', -34.5884, -58.4108, true, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N005', 'obj-norte-001', now() - INTERVAL '3 hours', 'activo', -34.5872, -58.4100, true, 'a1b2c3d4-0001-0001-0001-000000000001');

-- Empresa 1 — Turnos completados ayer
INSERT INTO public.guard_shifts (operator_id, objective_id, checkin_time, checkout_time,
  status, checkin_latitude, checkin_longitude, duration_minutes, tenant_id)
VALUES
  ('S-N006', 'obj-norte-002', now() - INTERVAL '20 hours', now() - INTERVAL '12 hours', 'finalizado', -34.6030, -58.3760, 480, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('S-N007', 'obj-norte-003', now() - INTERVAL '22 hours', now() - INTERVAL '14 hours', 'finalizado', -34.6640, -58.3700, 480, 'a1b2c3d4-0001-0001-0001-000000000001');

-- Empresa 2 — Turnos activos hoy
INSERT INTO public.guard_shifts (operator_id, objective_id, checkin_time, status,
  checkin_latitude, checkin_longitude, checkin_within_geofence, tenant_id)
VALUES
  ('S-P001', 'obj-pata-001', now() - INTERVAL '2 hours', 'activo', -38.9536, -68.0591, true, 'a1b2c3d4-0002-0002-0002-000000000002'),
  ('S-P002', 'obj-pata-002', now() - INTERVAL '3 hours', 'activo', -38.9325, -67.9937, true, 'a1b2c3d4-0002-0002-0002-000000000002');

-- Empresa 3 — Turnos activos hoy
INSERT INTO public.guard_shifts (operator_id, objective_id, checkin_time, status,
  checkin_latitude, checkin_longitude, checkin_within_geofence, tenant_id)
VALUES
  ('S-M001', 'obj-mx-001', now() - INTERVAL '6 hours', 'activo', 19.4276, -99.1679, true, 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M002', 'obj-mx-002', now() - INTERVAL '4 hours', 'activo', 19.3747, -99.1770, true, 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M003', 'obj-mx-003', now() - INTERVAL '5 hours', 'activo', 19.3075, -99.1785, true, 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('S-M004', 'obj-mx-004', now() - INTERVAL '7 hours', 'activo', 19.4361, -99.0719, true, 'a1b2c3d4-0003-0003-0003-000000000003');

-- ─────────────────────────────────────────────────────────────
-- PASO 5: ALARMAS (PÁNICO E INTRUSIÓN)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.alarms (triggered_by, objective_id, alarm_type, message,
  latitude, longitude, status, tenant_id)
VALUES
  -- Alarma activa en empresa 1 (para que el Super Admin la vea en rojo)
  ('S-N002', 'obj-norte-002', 'panico',
   'Guardia presionó botón de pánico — sujeto armado en caja fuerte',
   -34.6024, -58.3756, 'active', 'a1b2c3d4-0001-0001-0001-000000000001'),

  -- Alarma reconocida en empresa 3 (México)
  ('S-M003', 'obj-mx-003', 'intrusion',
   'Detector perimetral activado — zona de carga sur',
   19.3075, -99.1785, 'acknowledged', 'a1b2c3d4-0003-0003-0003-000000000003'),

  -- Alarma resuelta ayer en empresa 1
  ('S-N007', 'obj-norte-003', 'panico',
   'Alarma de prueba — ejercicio de seguridad mensual',
   -34.6637, -58.3697, 'resolved', 'a1b2c3d4-0001-0001-0001-000000000001');

-- ─────────────────────────────────────────────────────────────
-- PASO 6: HISTORIAL DE BILLING / COBROS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.billing_events (
  tenant_id, event_type, amount, currency, invoice_number, notes, created_at
) VALUES
  -- Empresa 1: Historial de pagos recibidos
  ('a1b2c3d4-0001-0001-0001-000000000001', 'subscription_started',  NULL,   'ARS', NULL,          'Inicio de suscripción — Plan Professional', now() - INTERVAL '90 days'),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'payment_received',  850000, 'ARS', 'FAC-2025-0001', 'Cobro mensual — Plan Professional — Abril 2025', now() - INTERVAL '60 days'),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'payment_received',  850000, 'ARS', 'FAC-2025-0002', 'Cobro mensual — Plan Professional — Mayo 2025', now() - INTERVAL '30 days'),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'payment_received',  920000, 'ARS', 'FAC-2025-0003', 'Cobro mensual — Plan Professional — Junio 2025 (ajuste inflacionario)', now() - INTERVAL '2 days'),

  -- Empresa 2: Trial iniciado
  ('a1b2c3d4-0002-0002-0002-000000000002', 'trial_started',     NULL,   'ARS', NULL,          'Inicio de período de prueba gratuito de 14 días', now() - INTERVAL '7 days'),

  -- Empresa 3: Enterprise — pago en USD
  ('a1b2c3d4-0003-0003-0003-000000000003', 'subscription_started',  NULL,   'USD', NULL,          'Alta Enterprise — Licencia anual prepaga', now() - INTERVAL '180 days'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'payment_received', 4800,  'USD', 'INV-MX-2025-001', 'Cobro anual Enterprise — USD 4,800/año', now() - INTERVAL '180 days'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'plan_upgraded',     NULL,  'USD', NULL,            'Upgrade de Professional a Enterprise — +50 operadores', now() - INTERVAL '90 days');

-- ─────────────────────────────────────────────────────────────
-- PASO 7: ENTRADAS DEL LIBRO DE GUARDIA (novedades)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.guard_book_entries (objective_id, operator_id, entry_type, content, urgency, tenant_id)
VALUES
  ('obj-norte-001', 'S-N001', 'novedad', 'Vehículo sospechoso estacionado frente al local. Patente ABC 123. Se comunicó con la central y se realizó seguimiento. Sin novedades adicionales.', 'media',  'a1b2c3d4-0001-0001-0001-000000000001'),
  ('obj-norte-002', 'S-N002', 'novedad', 'Revisión de cámaras de seguridad completada. Todo en orden. Fechas de las cámaras 2 y 4 están desactualizadas — se informó al cliente.', 'normal', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('obj-norte-003', 'S-N003', 'novedad', 'Ingreso de personal de mantenimiento a las 14:30 hs. Se verificaron credenciales y se firmó el libro de visitas. Salida registrada a las 17:15 hs.', 'normal', 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('obj-pata-001', 'S-P001', 'incidente','Intento de ingreso no autorizado en acceso norte. Se activó el protocolo de seguridad. Se notificó a la comisaría local. Denuncia radicada N° 44521.', 'alta',   'a1b2c3d4-0002-0002-0002-000000000002'),
  ('obj-mx-001',   'S-M001', 'novedad', 'Simulacro de evacuación completado en 4 minutos 32 segundos. Personal respondió correctamente. Se identificaron 2 puntos de mejora en el plan de evacuación.', 'normal', 'a1b2c3d4-0003-0003-0003-000000000003');

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Datos de demo cargados correctamente:';
  RAISE NOTICE '   • Empresas (tenants): %', (SELECT COUNT(*) FROM public.tenants WHERE slug IN ('seguridad-norte','vigilancia-patagonia','secureforce-mexico'));
  RAISE NOTICE '   • Objetivos: %',          (SELECT COUNT(*) FROM public.objectives WHERE id LIKE 'obj-%');
  RAISE NOTICE '   • Guardias (resources): %',(SELECT COUNT(*) FROM public.resources WHERE id LIKE 'S-%');
  RAISE NOTICE '   • Turnos (guard_shifts): %',(SELECT COUNT(*) FROM public.guard_shifts WHERE status IN ('activo','finalizado'));
  RAISE NOTICE '   • Alarmas: %',             (SELECT COUNT(*) FROM public.alarms);
  RAISE NOTICE '   • Eventos de billing: %',  (SELECT COUNT(*) FROM public.billing_events);
  RAISE NOTICE '   • Libro de guardia: %',    (SELECT COUNT(*) FROM public.guard_book_entries);
END $$;

COMMIT;
