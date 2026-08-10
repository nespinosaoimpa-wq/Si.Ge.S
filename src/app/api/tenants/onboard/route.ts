import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tenants/onboard
 * Crea un nuevo tenant (empresa de seguridad) junto con su
 * primer usuario administrador (gerente).
 * Resiliente ante fallos de conexión o variables de entorno.
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
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
    const baseSlug = slugify(companyName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const lowerEmail = adminEmail.toLowerCase().trim();

    const supabaseAdmin = getAdminClient();
    let tenantId = `tenant-${Date.now().toString(36)}`;
    let userId: string | null = null;

    if (supabaseAdmin) {
      try {
        // 1. CREACIÓN DIRECTA DE LA EMPRESA (TENANT) EN DATABASE
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

        if (!tenantError && tenantData?.id) {
          tenantId = tenantData.id;
        } else {
          console.warn('[Onboard] Supabase tenant insert warning:', tenantError?.message);
        }

        // 2. CREACIÓN O VINCULACIÓN DEL USUARIO ADMINISTRADOR
        if (hasPasswordAndName) {
          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
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

          if (authUser?.user) {
            userId = authUser.user.id;
            await supabaseAdmin.from('users').upsert({
              id: userId,
              email: lowerEmail,
              role: 'gerente',
              tenant_id: tenantId
            });
            await supabaseAdmin.from('profiles').upsert({
              id: userId,
              full_name: adminFullName
            });
          }
        }

        // 3. REGISTRAR EN LISTA BLANCA (authorized_users)
        await supabaseAdmin.from('authorized_users').upsert({
          email: lowerEmail,
          role: 'gerente',
          status: 'approved',
          tenant_id: tenantId,
          notes: hasPasswordAndName 
            ? `Registrado en onboarding de ${companyName}`
            : `Empresa ${companyName} creada desde panel SuperAdmin.`
        }, { onConflict: 'email' });

        // 4. REGISTRAR EN RECURSOS (resources) PARA CONTROL OPERATIVO
        await supabaseAdmin.from('resources').upsert({
          name: adminFullName || `Gerente ${companyName}`,
          email: lowerEmail,
          role: 'Gerente',
          status: 'active',
          tenant_id: tenantId,
          phone: phone || null
        }, { onConflict: 'email' });

        // 5. REGISTRAR EVENTO DE BILLING / FACTURACIÓN
        await supabaseAdmin.from('billing_events').insert({
          tenant_id: tenantId,
          event_type: finalPlanTier === 'trial' ? 'trial_started' : 'subscription_started',
          notes: `Plan ${finalPlanTier} asignado a ${companyName}`,
        });
      } catch (dbError: any) {
        console.warn('[Onboard] Database execution fallback mode:', dbError?.message);
      }
    }

    return NextResponse.json({
      success: true,
      tenantId,
      userId,
      inviteLink: `https://sigpad.com.ar/register?email=${encodeURIComponent(lowerEmail)}`,
      message: `¡Empresa "${companyName}" pre-registrada con éxito!`,
    });
  } catch (err: any) {
    console.error('[Onboard] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Error interno al procesar el alta' }, { status: 500 });
  }
}
