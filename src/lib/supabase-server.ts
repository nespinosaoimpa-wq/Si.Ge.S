import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — Supabase Server Client
// Usa SUPABASE_SERVICE_ROLE_KEY (server-only) para operaciones admin.
// Si la key no está disponible, cae al anon key con advertencia explícita.
// ──────────────────────────────────────────────────────────────────────────────

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjIzMzcsImV4cCI6MjA5OTIzODMzN30.ELmTZRPoXjOXi5p8D_g1yQs925oak7oz1BYasLhJ7yc';

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;

  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_ANON;

  // ⚠️ Si no hay service role key, las escrituras serán bloqueadas por RLS
  // porque auth.uid() === null en contexto serverless sin sesión activa.
  if (!hasServiceKey) {
    console.error(
      '[SIGPAD][SUPABASE] ⛔ SUPABASE_SERVICE_ROLE_KEY no está configurada.' +
      ' El cliente usará el anon key — RLS NO será bypasseado.' +
      ' Las inserciones/actualizaciones en tablas con tenant_isolation RLS FALLARÁN.' +
      ' Configura SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        // Identificador para trazabilidad en logs de Supabase
        'x-sigpad-client': 'server-api',
      },
    },
  }) as any;
}

/**
 * Verifica si el cliente tiene acceso de admin real (service role key presente).
 * Útil para endpoints de diagnóstico.
 */
export function hasAdminAccess(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
