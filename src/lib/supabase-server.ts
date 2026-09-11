import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — Supabase Server Client
// Usa SUPABASE_SERVICE_ROLE_KEY (server-only) para operaciones admin.
// Propaga W3C Trace Context (traceparent) para correlación perfecta de logs.
// ──────────────────────────────────────────────────────────────────────────────

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjIzMzcsImV4cCI6MjA5OTIzODMzN30.ELmTZRPoXjOXi5p8D_g1yQs925oak7oz1BYasLhJ7yc';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

function generateW3CTraceParent(): string {
  const hex = (len: number) => {
    let result = '';
    while (result.length < len) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result.slice(0, len);
  };
  return `00-${hex(32)}-${hex(16)}-01`;
}

export function createServiceClient() {
  const traceParent = generateW3CTraceParent();
  const traceId = traceParent.split('-')[1];

  return createClient(FALLBACK_URL, FALLBACK_SERVICE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-sigpad-client': 'server-api',
        'traceparent': traceParent,
        'x-sigpad-trace-id': traceId
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
