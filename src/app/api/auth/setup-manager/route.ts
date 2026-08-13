import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    
    const managerEmail = (body.email || '').toLowerCase().trim();
    const managerName = body.name || 'GERENTE ADMINISTRADOR';

    if (!managerEmail) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Resolve tenant
    let targetTenantId = 'a1b2c3d4-0001-0001-0001-000000000001';
    const { data: firstTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (firstTenant?.id) targetTenantId = firstTenant.id;

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
