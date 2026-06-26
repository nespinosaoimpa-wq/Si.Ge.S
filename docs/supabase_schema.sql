-- ============================================================
-- SPS (Security & Police Service) - Supabase Database Schema
-- Sistema integral de seguridad ciudadana y privada
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- 1. USERS - Personal con roles (gerente/operador/cliente)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('gerente', 'operador', 'cliente')),
    phone TEXT,
    dni TEXT UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. OBJECTIVES - Puntos georeferenciados (puestos de guardia)
-- ============================================================
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geofence_radius_meters INTEGER DEFAULT 100,
    sector TEXT,
    client_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. RESOURCES - Móviles, equipos, recursos logísticos
-- ============================================================
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('movil', 'radio', 'arma', 'chaleco', 'linterna', 'camara_corporal', 'otro')),
    serial_number TEXT UNIQUE,
    status TEXT DEFAULT 'disponible' CHECK (status IN ('disponible', 'asignado', 'mantenimiento', 'baja')),
    assigned_to UUID REFERENCES users(id),
    objective_id UUID REFERENCES objectives(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CLIENTS - Clientes de alto perfil
-- ============================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id),
    company_name TEXT,
    contact_name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    subscription_plan TEXT DEFAULT 'standard' CHECK (subscription_plan IN ('basic', 'standard', 'premium', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. GUARD_SHIFTS - Check-in/Check-out con geofencing
-- ============================================================
CREATE TABLE guard_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES users(id),
    objective_id UUID NOT NULL REFERENCES objectives(id),
    supervisor_id UUID REFERENCES users(id),
    checkin_time TIMESTAMPTZ,
    checkout_time TIMESTAMPTZ,
    checkin_latitude DOUBLE PRECISION,
    checkin_longitude DOUBLE PRECISION,
    checkout_latitude DOUBLE PRECISION,
    checkout_longitude DOUBLE PRECISION,
    checkin_within_geofence BOOLEAN,
    checkout_within_geofence BOOLEAN,
    resources_assigned UUID[],
    status TEXT DEFAULT 'programado' CHECK (status IN ('programado', 'activo', 'completado', 'ausente', 'cancelado')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PATROL_ROUTES - Rutas de rondines
-- ============================================================
CREATE TABLE patrol_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    objective_id UUID NOT NULL REFERENCES objectives(id),
    description TEXT,
    estimated_duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PATROL_CHECKPOINTS - Puntos de control por rondín
-- ============================================================
CREATE TABLE patrol_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES patrol_routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    expected_time_minutes INTEGER, -- minutos desde inicio del rondín
    tolerance_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PATROL_LOGS - Registros de rondines ejecutados
-- ============================================================
CREATE TABLE patrol_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES patrol_routes(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    shift_id UUID REFERENCES guard_shifts(id),
    checkpoint_id UUID NOT NULL REFERENCES patrol_checkpoints(id),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    within_geofence BOOLEAN,
    status TEXT DEFAULT 'sin_novedad' CHECK (status IN ('sin_novedad', 'con_novedad', 'omitido', 'atrasado')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. PATROL_ALERTS - Alertas críticas por rondines vencidos
-- ============================================================
CREATE TABLE patrol_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES patrol_routes(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    checkpoint_id UUID NOT NULL REFERENCES patrol_checkpoints(id),
    shift_id UUID REFERENCES guard_shifts(id),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('checkpoint_vencido', 'rondin_incompleto', 'fuera_de_geofence', 'sin_regreso')),
    severity TEXT DEFAULT 'alta' CHECK (severity IN ('media', 'alta', 'critica')),
    message TEXT NOT NULL,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. INCIDENT_REPORTS - Novedades con tipo, hora, involucrados
-- ============================================================
CREATE TABLE incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES users(id),
    objective_id UUID NOT NULL REFERENCES objectives(id),
    shift_id UUID REFERENCES guard_shifts(id),
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'robo_hurto', 'dano', 'persona_sospechosa', 'vehiculo_sospechoso',
        'alarma_activada', 'accidente', 'incendio', 'otro'
    )),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('baja', 'media', 'alta', 'critica')),
    description TEXT NOT NULL,
    involved_persons JSONB DEFAULT '[]',
    preventive_statement TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp_synced TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_atencion', 'resuelto', 'escalado', 'archivado')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. TICKETS - Sistema de tickets rápidos para clientes
-- ============================================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number SERIAL,
    client_id UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL CHECK (category IN ('emergencia', 'asistencia', 'mantenimiento', 'anomalia')),
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    status TEXT DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_atencion', 'programado', 'resuelto', 'cerrado')),
    assigned_operator_id UUID REFERENCES users(id),
    objective_id UUID REFERENCES objectives(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. FEEDBACK_SCORES - Sistema de estrellas por interacción
-- ============================================================
CREATE TABLE feedback_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id),
    incident_id UUID REFERENCES incident_reports(id),
    client_id UUID NOT NULL REFERENCES users(id),
    operator_id UUID REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. CAMERAS - Catastro de cámaras con ángulos/cobertura
-- ============================================================
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_code TEXT UNIQUE NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('privada', 'comunitaria', 'publica')),
    owner_client_id UUID REFERENCES clients(id),
    angle_degrees INTEGER, -- ángulo de cobertura en grados
    direction TEXT, -- Norte, Sur, Este, Oeste, etc.
    coverage_description TEXT,
    brand TEXT,
    model TEXT,
    resolution TEXT,
    has_night_vision BOOLEAN DEFAULT false,
    has_audio BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'activa' CHECK (status IN ('activa', 'inactiva', 'mantenimiento', 'fuera_de_servicio')),
    last_maintenance TIMESTAMPTZ,
    recording_retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. EVIDENCE_PHOTOS - Fotos con metadatos GPS y timestamp
-- ============================================================
CREATE TABLE evidence_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incident_reports(id),
    shift_id UUID REFERENCES guard_shifts(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    metadata_hash TEXT NOT NULL, -- SHA-256 para integridad
    file_size_bytes BIGINT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. GPS_TRACKING - Posiciones GPS en tiempo real
-- ============================================================
CREATE TABLE gps_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    battery_level INTEGER,
    is_moving BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para consultas rápidas por usuario y tiempo
CREATE INDEX idx_gps_tracking_user_time ON gps_tracking(user_id, recorded_at DESC);

-- ============================================================
-- 16. FROZEN_LOGS - Logs congelados por "Botón de Pánico Judicial"
-- ============================================================
CREATE TABLE frozen_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frozen_by UUID NOT NULL REFERENCES users(id),
    freeze_reason TEXT NOT NULL,
    incident_latitude DOUBLE PRECISION NOT NULL,
    incident_longitude DOUBLE PRECISION NOT NULL,
    freeze_radius_meters INTEGER DEFAULT 2000,
    freeze_start TIMESTAMPTZ NOT NULL,
    freeze_end TIMESTAMPTZ NOT NULL,
    frozen_data JSONB NOT NULL, -- snapshot completo de logs congelados
    integrity_hash TEXT NOT NULL, -- SHA-256 del frozen_data
    is_active BOOLEAN DEFAULT true,
    unfrozen_by UUID REFERENCES users(id),
    unfrozen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. JUDICIAL_EXPORTS - Exportaciones judiciales con firma digital
-- ============================================================
CREATE TABLE judicial_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_by UUID NOT NULL REFERENCES users(id),
    incident_id UUID REFERENCES incident_reports(id),
    frozen_log_id UUID REFERENCES frozen_logs(id),
    export_type TEXT NOT NULL CHECK (export_type IN ('acta_procedimiento', 'reporte_incidencia', 'logs_movimiento', 'exportacion_completa')),
    pdf_url TEXT,
    content_hash TEXT NOT NULL, -- SHA-256 del contenido del PDF
    digital_signature TEXT,
    includes_photos BOOLEAN DEFAULT false,
    includes_gps_logs BOOLEAN DEFAULT false,
    includes_statements BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. STRATEGIC_ALERTS - Alertas de inteligencia estratégica
-- ============================================================
CREATE TABLE strategic_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('zona_silenciosa', 'correlacion_anomalias', 'patron_delictivo', 'vulnerabilidad_detectada')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sector TEXT,
    related_tickets UUID[],
    related_incidents UUID[],
    severity TEXT DEFAULT 'media' CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius_meters INTEGER,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT false,
    auto_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función: Verificar si el usuario es gerente (evita recursión en RLS)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE frozen_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE judicial_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_alerts ENABLE ROW LEVEL SECURITY;

-- Gerentes: acceso total
CREATE POLICY "gerentes_full_access" ON users
    FOR ALL USING (public.is_manager());

-- Usuarios: leer su propio registro
CREATE POLICY "users_read_own" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "gerentes_full_access" ON objectives
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON guard_shifts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON incident_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON tickets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON cameras
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON frozen_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

CREATE POLICY "gerentes_full_access" ON judicial_exports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'gerente')
    );

-- Operadores: acceso a sus propios datos
CREATE POLICY "operadores_own_shifts" ON guard_shifts
    FOR ALL USING (operator_id = auth.uid());

CREATE POLICY "operadores_own_patrols" ON patrol_logs
    FOR ALL USING (operator_id = auth.uid());

CREATE POLICY "operadores_own_incidents" ON incident_reports
    FOR ALL USING (operator_id = auth.uid());

CREATE POLICY "operadores_own_photos" ON evidence_photos
    FOR ALL USING (operator_id = auth.uid());

CREATE POLICY "operadores_own_gps" ON gps_tracking
    FOR ALL USING (user_id = auth.uid());

-- Clientes: acceso a sus tickets y feedback
CREATE POLICY "clientes_own_tickets" ON tickets
    FOR ALL USING (client_id = auth.uid());

CREATE POLICY "clientes_own_feedback" ON feedback_scores
    FOR ALL USING (client_id = auth.uid());

CREATE POLICY "clientes_view_cameras" ON cameras
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.user_id = auth.uid() AND c.id = cameras.owner_client_id
        )
        OR type = 'comunitaria'
    );

-- ============================================================
-- INDEXES para performance
-- ============================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_objectives_client ON objectives(client_id);
CREATE INDEX idx_objectives_sector ON objectives(sector);
CREATE INDEX idx_guard_shifts_operator ON guard_shifts(operator_id);
CREATE INDEX idx_guard_shifts_objective ON guard_shifts(objective_id);
CREATE INDEX idx_guard_shifts_status ON guard_shifts(status);
CREATE INDEX idx_patrol_logs_operator ON patrol_logs(operator_id);
CREATE INDEX idx_patrol_logs_route ON patrol_logs(route_id);
CREATE INDEX idx_incident_reports_operator ON incident_reports(operator_id);
CREATE INDEX idx_incident_reports_type ON incident_reports(incident_type);
CREATE INDEX idx_incident_reports_status ON incident_reports(status);
CREATE INDEX idx_incident_reports_created ON incident_reports(created_at DESC);
CREATE INDEX idx_tickets_client ON tickets(client_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_cameras_type ON cameras(type);
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_cameras_location ON cameras(latitude, longitude);
CREATE INDEX idx_evidence_photos_incident ON evidence_photos(incident_id);
CREATE INDEX idx_frozen_logs_active ON frozen_logs(is_active);
CREATE INDEX idx_strategic_alerts_type ON strategic_alerts(alert_type);
CREATE INDEX idx_strategic_alerts_resolved ON strategic_alerts(resolved);

-- ============================================================
-- FUNCTIONS - Funciones auxiliares
-- ============================================================

-- Función: Verificar si operador está dentro del geofence
CREATE OR REPLACE FUNCTION check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_objective_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_obj_lat DOUBLE PRECISION;
    v_obj_lng DOUBLE PRECISION;
    v_radius INTEGER;
    v_distance DOUBLE PRECISION;
BEGIN
    SELECT latitude, longitude, geofence_radius_meters
    INTO v_obj_lat, v_obj_lng, v_radius
    FROM objectives WHERE id = p_objective_id;

    -- Haversine simplificado (distancia en metros)
    v_distance := 6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(p_lat - v_obj_lat) / 2), 2) +
        COS(RADIANS(v_obj_lat)) * COS(RADIANS(p_lat)) *
        POWER(SIN(RADIANS(p_lng - v_obj_lng) / 2), 2)
    ));

    RETURN v_distance <= v_radius;
END;
$$ LANGUAGE plpgsql;

-- Función: Congelar logs (Botón de Pánico Judicial)
CREATE OR REPLACE FUNCTION freeze_logs(
    p_frozen_by UUID,
    p_reason TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius INTEGER DEFAULT 2000,
    p_hours INTEGER DEFAULT 2
) RETURNS UUID AS $$
DECLARE
    v_freeze_id UUID;
    v_frozen_data JSONB;
    v_freeze_start TIMESTAMPTZ;
    v_freeze_end TIMESTAMPTZ;
BEGIN
    v_freeze_end := NOW();
    v_freeze_start := NOW() - (p_hours || ' hours')::INTERVAL;

    -- Capturar todos los datos relevantes en la zona y periodo
    SELECT jsonb_build_object(
        'gps_logs', COALESCE((
            SELECT jsonb_agg(row_to_json(g))
            FROM gps_tracking g
            JOIN users u ON g.user_id = u.id
            WHERE g.recorded_at BETWEEN v_freeze_start AND v_freeze_end
            AND u.role = 'operador'
        ), '[]'::jsonb),
        'shifts', COALESCE((
            SELECT jsonb_agg(row_to_json(s))
            FROM guard_shifts s
            WHERE s.checkin_time BETWEEN v_freeze_start AND v_freeze_end
            OR s.checkout_time BETWEEN v_freeze_start AND v_freeze_end
        ), '[]'::jsonb),
        'incidents', COALESCE((
            SELECT jsonb_agg(row_to_json(i))
            FROM incident_reports i
            WHERE i.created_at BETWEEN v_freeze_start AND v_freeze_end
        ), '[]'::jsonb),
        'patrol_logs', COALESCE((
            SELECT jsonb_agg(row_to_json(pl))
            FROM patrol_logs pl
            WHERE pl.created_at BETWEEN v_freeze_start AND v_freeze_end
        ), '[]'::jsonb)
    ) INTO v_frozen_data;

    INSERT INTO frozen_logs (
        frozen_by, freeze_reason,
        incident_latitude, incident_longitude,
        freeze_radius_meters,
        freeze_start, freeze_end,
        frozen_data, integrity_hash
    ) VALUES (
        p_frozen_by, p_reason,
        p_lat, p_lng,
        p_radius,
        v_freeze_start, v_freeze_end,
        v_frozen_data,
        encode(digest(v_frozen_data::TEXT, 'sha256'), 'hex')
    ) RETURNING id INTO v_freeze_id;

    RETURN v_freeze_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Buscar cámaras en ruta de escape (radio de 500m)
CREATE OR REPLACE FUNCTION find_escape_route_cameras(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 500
) RETURNS TABLE (
    camera_id UUID,
    camera_code TEXT,
    location_name TEXT,
    distance_meters DOUBLE PRECISION,
    direction TEXT,
    angle_degrees INTEGER,
    type TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.camera_code,
        c.location_name,
        6371000 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(c.latitude - p_lat) / 2), 2) +
            COS(RADIANS(p_lat)) * COS(RADIANS(c.latitude)) *
            POWER(SIN(RADIANS(c.longitude - p_lng) / 2), 2)
        )) AS distance_meters,
        c.direction,
        c.angle_degrees,
        c.type,
        c.status
    FROM cameras c
    WHERE c.status = 'activa'
    AND 6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(c.latitude - p_lat) / 2), 2) +
        COS(RADIANS(p_lat)) * COS(RADIANS(c.latitude)) *
        POWER(SIN(RADIANS(c.longitude - p_lng) / 2), 2)
    )) <= p_radius_meters
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_objectives_updated_at BEFORE UPDATE ON objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_guard_shifts_updated_at BEFORE UPDATE ON guard_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_incident_reports_updated_at BEFORE UPDATE ON incident_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_cameras_updated_at BEFORE UPDATE ON cameras FOR EACH ROW EXECUTE FUNCTION update_updated_at();
