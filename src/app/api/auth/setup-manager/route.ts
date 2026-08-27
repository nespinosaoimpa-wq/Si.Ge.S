import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { MASTER_TENANT_ID } from '@/lib/resolve-tenant';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    
    const managerEmail = (body.email || '').toLowerCase().trim();
    const managerName = body.name || 'GERENTE ADMINISTRADOR';

    if (!managerEmail) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Resolve tenant: usar el que venga en el body (enviado por el SuperAdmin), o buscar por email del manager
    let targetTenantId: string | null = body.tenant_id && body.tenant_id !== MASTER_TENANT_ID ? body.tenant_id : null;
    if (!targetTenantId) {
      try {
        const { data: tenantByEmail } = await supabase
          .from('tenants')
          .select('id')
          .ilike('admin_email', managerEmail)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tenantByEmail?.id) targetTenantId = tenantByEmail.id;
      } catch (e) {}
    }

    // Add to authorized_users with status approved
    await supabase.from('authorized_users').upsert({
      email: managerEmail,
      role: 'gerente',
      status: 'approved',
      tenant_id: targetTenantId
    }, { onConflict: 'email' });

    // Insert or update in resources
    const { data: existing } = await supabase
      .from('resources')
      .select('id')
      .eq('email', managerEmail)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('resources')
        .insert({
          name: managerName,
          email: managerEmail,
          role: 'Gerente',
          status: 'active',
          tenant_id: targetTenantId
        });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Correo habilitado exitosamente como Gerente.', 
      email: managerEmail
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
