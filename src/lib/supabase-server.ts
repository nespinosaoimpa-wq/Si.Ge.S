import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — Supabase Server Client
// Usa SUPABASE_SERVICE_ROLE_KEY (server-only) para operaciones admin.
// Si la key no está disponible, cae al anon key con advertencia explícita.
// ──────────────────────────────────────────────────────────────────────────────

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjIzMzcsImV4cCI6MjA5OTIzODMzN30.ELmTZRPoXjOXi5p8D_g1yQs925oak7oz1BYasLhJ7yc';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
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
