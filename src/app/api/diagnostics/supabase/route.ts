import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, hasAdminAccess } from '@/lib/supabase-server';

// ──────────────────────────────────────────────────────────────────────────────
// SIGPAD — Endpoint de Diagnóstico de Supabase
// GET /api/diagnostics/supabase
//
// Verifica la configuración de Supabase en el entorno de producción (Vercel):
//   1. Presencia de variables de entorno críticas
//   2. Conectividad (SELECT count(*) FROM objectives)
//   3. Permisos de escritura (INSERT + DELETE en objectives)
//
// ⚠️ IMPORTANTE: Este endpoint es solo para diagnóstico. Retirarlo o
//    protegerlo con autenticación una vez resuelto el problema de producción.
// ──────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const startTime = Date.now();

  // ── 1. Verificación de variables de entorno ──────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Extraer el dominio de la URL para no exponer la URL completa
  let urlDomain: string | null = null;
  try {
    if (supabaseUrl) urlDomain = new URL(supabaseUrl).hostname;
  } catch {
    urlDomain = 'INVALID_URL';
  }

  const envReport = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `present (domain: ${urlDomain})` : '⛔ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '✅ present' : '⛔ MISSING — RLS no será bypasseado, las escrituras pueden fallar',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? '✅ present' : '⚠️ missing (usando hardcoded fallback)',
    adminAccess: hasAdminAccess() ? '✅ service_role' : '⛔ anon_key (RLS activo)',
  };

  // ── 2. Test de conectividad (SELECT) ─────────────────────────────────────
  let connectivityResult: { ok: boolean; rowCount?: number; error?: string } = { ok: false };
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from('objectives')
      .select('*', { count: 'exact', head: true });

    if (error) {
      connectivityResult = { ok: false, error: error.message };
    } else {
      connectivityResult = { ok: true, rowCount: count ?? 0 };
    }
  } catch (e: any) {
    connectivityResult = { ok: false, error: e?.message || 'Unknown exception' };
  }

  // ── 3. Test de permisos de escritura (INSERT + DELETE) ───────────────────
  let writeResult: { ok: boolean; insertedId?: string; error?: string; rlsBlocked?: boolean } = { ok: false };
  const diagId = `DIAG-${Date.now()}`;

  try {
    const supabase = createServiceClient();

    // Obtener un tenant_id válido para el test
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const testPayload = {
      id: diagId,
      name: `[DIAGNOSTICO] Test ${diagId}`,
      address: 'Test automático — borrar si queda',
      client_name: 'DIAGNOSTIC',
      latitude: -31.6107,
      longitude: -60.6973,
      geofence_radius: 100,
      is_active: false,
      tenant_id: tenant?.id || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('objectives')
      .insert([testPayload])
      .select('id')
      .single();

    if (insertError) {
      const isRls =
        insertError.message?.toLowerCase().includes('rls') ||
        insertError.message?.toLowerCase().includes('row-level') ||
        insertError.message?.toLowerCase().includes('policy') ||
        insertError.code === '42501';

      writeResult = {
        ok: false,
        error: insertError.message,
        rlsBlocked: isRls,
      };
    } else {
      // INSERT exitoso — ahora limpiamos
      writeResult = { ok: true, insertedId: inserted?.id };
      await supabase.from('objectives').delete().eq('id', diagId);
    }
  } catch (e: any) {
    writeResult = { ok: false, error: e?.message || 'Unknown exception during write test' };
  }

  // ── 4. Verificar políticas RLS activas en objectives ─────────────────────
  let rlsPolicies: { name: string; command: string }[] = [];
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .rpc('get_objectives_policies' as any)
      .select('*');
    if (data) rlsPolicies = data;
  } catch {
    // La función RPC puede no existir — es opcional
    rlsPolicies = [];
  }

  // ── 5. Diagnóstico consolidado ────────────────────────────────────────────
  const overallStatus =
    hasServiceKey && connectivityResult.ok && writeResult.ok
      ? '✅ CONFIGURACIÓN CORRECTA'
      : !hasServiceKey
      ? '⛔ CRÍTICO: Falta SUPABASE_SERVICE_ROLE_KEY en Vercel'
      : !connectivityResult.ok
      ? '⛔ CRÍTICO: Sin conectividad a Supabase'
      : !writeResult.ok
      ? writeResult.rlsBlocked
        ? '⛔ CRÍTICO: RLS bloquea escrituras — aplicar script SQL de emergencia'
        : '⛔ ERROR: Fallo de escritura (ver detalles)'
      : '⚠️ PARCIAL';

  const recommendation = !hasServiceKey
    ? 'Agregar SUPABASE_SERVICE_ROLE_KEY en Vercel → Settings → Environment Variables. El valor debe ser el JWT del service_role (empieza con eyJ...)'
    : writeResult.rlsBlocked
    ? 'Aplicar supabase/migrations/20260814_fix_objectives_rls_emergency.sql en Supabase SQL Editor'
    : writeResult.ok
    ? 'Ninguna acción requerida — la configuración es correcta'
    : `Investigar el error: ${writeResult.error}`;

  const elapsed = Date.now() - startTime;

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
      status: overallStatus,
      recommendation,
      environment: envReport,
      connectivity: connectivityResult,
      write_permissions: writeResult,
      rls_policies: rlsPolicies.length > 0 ? rlsPolicies : 'No se pudieron consultar (función RPC no disponible)',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  );
}
