import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * POST /api/tenants/switch
 * Conmuta la empresa activa (tenant_id) del usuario logueado
 * y actualiza la cookie y base de datos con los datos de la nueva empresa.
 */

export async function POST(req: NextRequest) {
  try {
    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    let user: any = null;
    try {
      user = JSON.parse(decodeURIComponent(userCookie.value));
    } catch {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const { tenantId } = await req.json();
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId es requerido.' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    // 1. Buscar la empresa en la tabla tenants
    let tenantName = 'Empresa de Seguridad';
    let tenantData: any = null;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, billing_status, plan_tier')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenant) {
      tenantData = tenant;
      tenantName = tenant.name;
    } else {
      // Buscar en métricas demo
      const { data: metric } = await supabaseAdmin
        .from('saas_tenant_metrics')
        .select('tenant_id, tenant_name, billing_status, plan_tier')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (metric) {
        tenantName = metric.tenant_name;
        tenantData = { id: metric.tenant_id, name: metric.tenant_name, billing_status: metric.billing_status, plan_tier: metric.plan_tier };
      }
    }

    // 2. Actualizar el tenant_id en la base de datos si el usuario tiene correo registrado
    const lowerEmail = user.email ? user.email.toLowerCase().trim() : null;
    if (lowerEmail) {
      try {
        await supabaseAdmin.from('users').update({ tenant_id: tenantId }).ilike('email', lowerEmail);
      } catch (e) {}
      try {
        await supabaseAdmin.from('authorized_users').update({ tenant_id: tenantId }).ilike('email', lowerEmail);
      } catch (e) {}
      try {
        await supabaseAdmin.from('resources').update({ tenant_id: tenantId }).ilike('email', lowerEmail);
      } catch (e) {}
    }

    // 3. Generar el nuevo objeto de usuario con la empresa conmutada
    const updatedUser = {
      ...user,
      tenant_id: tenantId,
      company_name: tenantName,
      user_metadata: {
        ...(user.user_metadata || {}),
        tenant_id: tenantId,
        company_name: tenantName,
      },
    };

    const res = NextResponse.json({
      success: true,
      user: updatedUser,
      tenant: tenantData || { id: tenantId, name: tenantName },
      message: `Empresa conmutada a "${tenantName}" correctamente.`,
    });

    // 4. Actualizar cookie de sesión HTTP
    res.cookies.set('SIGPAD_user', encodeURIComponent(JSON.stringify(updatedUser)), {
      path: '/',
      maxAge: 2592000, // 30 días
      sameSite: 'lax',
    });
    res.cookies.set('SIGPAD_bypass_active', 'true', {
      path: '/',
      maxAge: 2592000,
      sameSite: 'lax',
    });

    return res;
  } catch (err: any) {
    console.error('[TENANT_SWITCH_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Error al conmutar empresa' }, { status: 500 });
  }
}
