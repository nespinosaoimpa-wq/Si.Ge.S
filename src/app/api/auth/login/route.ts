import { createClient, isConfigured } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role: requestedRole } = await request.json();
    const supabase = createClient();
    const adminSupabase = createServiceClient();

    const isDemoMode = process.env.SIGPAD_DEMO_MODE === 'true' || 
                       process.env.SIGPAD_DEMO_MODE !== 'false' || 
                       !isConfigured;

    // 🛡️ TACTICAL BYPASS: Ensure the main manager can always get in (in Demo mode or unconfigured mode)
    const lowerEmail = email.toLowerCase().trim();
    if (isDemoMode && lowerEmail === 'nespinosa.oimpa@gmail.com') {
      const isPersonalPassword = password === 'Nico1905';
      const isMaster = password === 'SIGPAD2026' || password === '1234';

      if (isPersonalPassword || isMaster) {
        console.log(`[AUTH] Tactical login for ${lowerEmail}`);
        
        let managerRes = null;
        if (isConfigured) {
          try {
            const { data } = await adminSupabase
              .from('resources')
              .select('id, name')
              .ilike('email', lowerEmail)
              .single();
            managerRes = data;
          } catch {}
        }
          
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
    const isMasterOperator = password === 'SIGPAD2026';
    const isMasterAdmin = password === '1234';

    if (isDemoMode && (isMasterAdmin || isMasterOperator)) {
      // If it's a master password for personnel, we check if the email exists in resources
      if (isMasterOperator && isConfigured) {
        try {
          const { data: resources } = await adminSupabase
            .from('resources')
            .select('id, name, role, status')
            .ilike('email', lowerEmail)
            .neq('status', 'baja')
            .order('created_at', { ascending: false })
            .limit(1);
          
          const resource = resources?.[0];

          if (resource) {
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
        } catch {}
      }

      console.log(`[AUTH] Admin Master PIN used for ${email}`);
      return NextResponse.json({ 
        user: { email, role: requestedRole || 'gerente', id: 'demo-user', name: 'Usuario Demo' },
        session: { access_token: 'demo-token' } 
      });
    }

    if (!isConfigured) {
      return NextResponse.json({ 
        error: '⚠️ FALTAN VARIABLES DE ENTORNO: Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el panel de Vercel (Environment Variables) o ingresa con el usuario maestro nico1905.' 
      }, { status: 400 });
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
    console.error('[AUTH_API] Catch error:', error);
    const msg = error?.message || 'Error interno del servidor';
    return NextResponse.json({ 
      error: msg.includes('fetch failed') 
        ? '⚠️ ERROR DE CONEXIÓN EN VERCEL: Configura las variables de entorno en Vercel (Settings -> Environment Variables).' 
        : msg 
    }, { status: 500 });
  }
}

