import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tenants/onboard
 * Crea un nuevo tenant (empresa de seguridad) junto con su
 * primer usuario administrador (gerente).
 * Operaciones directas sobre tablas (sin depender de funciones RPC).
 */

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
      planTier,
    } = body;

    if (!companyName || !adminEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: companyName, adminEmail' },
        { status: 400 }
      );
    }

    const finalPlanTier = (!planTier || planTier === 'trial') ? 'professional' : planTier;
    const hasPasswordAndName = !!(adminPassword && adminFullName);
    let tenantId: string;
    let userId: string | null = null;

    // 1. CREACIÓN DIRECTA DE LA EMPRESA (TENANT) EN DATABASE
    const baseSlug = slugify(companyName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const lowerEmail = adminEmail.toLowerCase().trim();

    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: companyName,
        slug: slug,
        country_code: countryCode,
        billing_status: (finalPlanTier === 'trial' ? 'trial' : 'active'),
        plan_tier: finalPlanTier,
        admin_email: lowerEmail,
        tax_id: taxId || null,
        phone: phone || null,
        is_active: true
      })
      .select('id')
      .single();

    if (tenantError) {
      console.error('[Onboard] Direct tenant insert error:', tenantError);
      return NextResponse.json({ error: `Error al crear empresa: ${tenantError.message}` }, { status: 500 });
    }

    tenantId = tenantData.id;

    // 2. CREACIÓN O VINCULACIÓN DEL USUARIO ADMINISTRADOR
    if (hasPasswordAndName) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: lowerEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
          role: 'gerente',
          tenant_id: tenantId,
          company_name: companyName
        },
      });

      if (authError) {
        console.error('[Onboard] Auth admin createUser error:', authError);
      } else if (authUser?.user) {
        userId = authUser.user.id;

        // Registrar en public.users
        await supabaseAdmin.from('users').upsert({
          id: userId,
          email: lowerEmail,
          role: 'gerente',
          tenant_id: tenantId
        });

        // Registrar en public.profiles
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          full_name: adminFullName
        });
      }
    }

    // 3. REGISTRAR EN LISTA BLANCA (authorized_users)
    try {
      await supabaseAdmin.from('authorized_users').upsert({
        email: lowerEmail,
        role: 'gerente',
        status: 'approved',
        tenant_id: tenantId,
        notes: hasPasswordAndName 
          ? `Registrado en onboarding de ${companyName}`
          : `Empresa ${companyName} creada desde panel SuperAdmin.`
      }, { onConflict: 'email' });
    } catch (e) {
      console.warn('[Onboard] authorized_users upsert warning:', e);
    }

    // 4. REGISTRAR EN RECURSOS (resources) PARA CONTROL OPERATIVO
    try {
      await supabaseAdmin.from('resources').upsert({
        name: adminFullName || `Gerente ${companyName}`,
        email: lowerEmail,
        role: 'Gerente',
        status: 'active',
        tenant_id: tenantId,
        phone: phone || null
      }, { onConflict: 'email' });
    } catch (e) {
      console.warn('[Onboard] resources upsert warning:', e);
    }

    // 5. REGISTRAR EVENTO DE BILLING / FACTURACIÓN
    try {
      await supabaseAdmin.from('billing_events').insert({
        tenant_id: tenantId,
        event_type: finalPlanTier === 'trial' ? 'trial_started' : 'subscription_started',
        notes: `Plan ${finalPlanTier} asignado a ${companyName}`,
      });
    } catch (e) {
      console.warn('[Onboard] billing_events warning:', e);
    }

    return NextResponse.json({
      success: true,
      tenantId,
      userId,
      inviteLink: `https://sigpad.com.ar/register?email=${encodeURIComponent(lowerEmail)}`,
      message: hasPasswordAndName
        ? `¡Empresa "${companyName}" registrada con éxito!`
        : `¡Empresa "${companyName}" pre-registrada! Envía el enlace al gerente para que configure su clave.`,
    });
  } catch (err: any) {
    console.error('[Onboard] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
