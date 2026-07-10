import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tenants/onboard
 * Crea un nuevo tenant (empresa de seguridad) junto con su
 * primer usuario administrador (gerente).
 * Disponible sin autenticación para self-service SaaS.
 */

// Lazy factory — only runs at request time, NOT at build time
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    const body = await req.json();
    const {
      companyName,
      adminEmail,
      adminPassword,
      adminFullName,
      countryCode = 'ar',
      taxId,
      phone,
    } = body;

    if (!companyName || !adminEmail || !adminPassword || !adminFullName) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: companyName, adminEmail, adminPassword, adminFullName' },
        { status: 400 }
      );
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
        role: 'gerente',
      },
    });

    if (authError) {
      console.error('[Onboard] Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user.id;

    // 2. Crear entrada en public.users primero (sin tenant_id aún)
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: adminEmail.toLowerCase().trim(),
        role: 'gerente',
        tenant_id: null,
      });

    if (userInsertError) {
      console.error('[Onboard] User insert error:', userInsertError);
      // Cleanup: remove auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: userInsertError.message }, { status: 500 });
    }

    // 3. Llamar a la función SQL atómica para crear tenant + vincular admin
    const slug = slugify(companyName);
    const { data: tenantData, error: tenantError } = await supabaseAdmin.rpc(
      'create_tenant_with_admin',
      {
        p_tenant_name: companyName,
        p_tenant_slug: slug,
        p_admin_email: adminEmail.toLowerCase().trim(),
        p_admin_user_id: userId,
        p_country_code: countryCode,
        p_plan_tier: 'trial',
      }
    );

    if (tenantError) {
      console.error('[Onboard] Tenant creation error:', tenantError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    const tenantId = tenantData as string;

    // 4. Actualizar datos adicionales del tenant (tax_id, phone)
    if (taxId || phone) {
      await supabaseAdmin
        .from('tenants')
        .update({ tax_id: taxId, phone })
        .eq('id', tenantId);
    }

    // 5. Crear perfil del admin
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: adminFullName,
    });

    // 6. Registrar evento de billing: trial_started
    await supabaseAdmin.from('billing_events').insert({
      tenant_id: tenantId,
      event_type: 'trial_started',
      notes: `Trial de 14 días iniciado para ${companyName}`,
    });

    return NextResponse.json({
      success: true,
      tenantId,
      userId,
      message: `¡Empresa "${companyName}" registrada con éxito! Trial de 14 días activo.`,
    });
  } catch (err: any) {
    console.error('[Onboard] Unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
