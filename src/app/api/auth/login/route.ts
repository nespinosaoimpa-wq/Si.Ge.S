import { createClient } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();
    const supabase = createClient();
    const adminSupabase = createServiceClient();

    // 🛡️ TACTICAL BYPASS: Ensure the main manager can always get in
    const lowerEmail = email.toLowerCase().trim();
    if (lowerEmail === 'nespinosa.oimpa@gmail.com') {
      const isPersonalPassword = password === 'Nico1905';
      const isMaster = password === 'siges2026' || password === '1234';

      if (isPersonalPassword || isMaster) {
        console.log(`[AUTH] Tactical login for ${lowerEmail}`);
        
        // Find actual resource ID for the manager to prevent FK errors
        const { data: managerRes } = await adminSupabase
          .from('resources')
          .select('id, name')
          .ilike('email', lowerEmail)
          .single();
          
        return NextResponse.json({ 
          user: { 
            email: lowerEmail, 
            role: 'gerente', 
            id: managerRes?.id || 'S-701', 
            name: managerRes?.name || 'Nico Espinosa' 
          },
          session: { access_token: 'demo-token-bypass' } 
        });
      }
    }

    // Master PIN for testing/demo purposes
    const isMasterOperator = password === 'siges2026';
    const isMasterAdmin = password === '1234';

    if (isMasterAdmin || isMasterOperator) {
      // If it's a master password for personnel, we check if the email exists in resources
      if (isMasterOperator) {

        const { data: resources, error: resError } = await adminSupabase
          .from('resources')
          .select('id, name, role, status')
          .ilike('email', lowerEmail)
          .neq('status', 'baja')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const resource = resources?.[0];

        if (!resource) {
          console.error(`[AUTH] Login failed: Resource with email ${lowerEmail} not found or status is 'baja'.`);
          return NextResponse.json({ 
            error: `IDENTIDAD NO ENCONTRADA: El correo ${lowerEmail} no est registrado como personal activo. Verifique con su administrador.` 
          }, { status: 401 });
        }

        // Determine effective role based on resource role
        // If the role in DB contains 'gerente' (case insensitive), we grant gerente role
        const dbRole = (resource.role || '').toLowerCase();
        const effectiveRole = dbRole.includes('gerente') ? 'gerente' : 'operador';
        
        console.log(`[AUTH] Master PIN Login Success for ${lowerEmail} as ${effectiveRole}`);

        return NextResponse.json({ 
          user: { 
            email, 
            role: effectiveRole, 
            id: resource.id, 
            name: resource.name 
          },
          session: { access_token: 'demo-token-tactical' } 
        });
      }

      console.log(`[AUTH] Admin Master PIN used for ${email}`);
      return NextResponse.json({ 
        user: { email, role: requestedRole || 'gerente', id: 'demo-user' },
        session: { access_token: 'demo-token' } 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`[AUTH] Supabase Auth Error: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // After successful sign in, fetch the role from our users table or metadata
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    const role = profile?.role || data.user.user_metadata?.role || 'operador';

    // 🔗 AUTO-LINKING: Link Auth user to Resource record if not already linked
    try {
      const { data: resource } = await adminSupabase
        .from('resources')
        .select('id, assigned_to')
        .ilike('email', email.toLowerCase().trim())
        .order('status', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (resource && !resource.assigned_to) {
        await adminSupabase
          .from('resources')
          .update({ assigned_to: data.user.id })
          .eq('id', resource.id);
        console.log(`[AUTH] Linked user ${data.user.id} to resource ${resource.id}`);
      }
    } catch (e) {
      console.error('[AUTH] Auto-linking failed:', e);
    }

    return NextResponse.json({ 
      user: {
        ...data.user,
        role: role
      }, 
      session: data.session 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

