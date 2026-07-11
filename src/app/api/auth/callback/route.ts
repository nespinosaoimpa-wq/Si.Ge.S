import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user?.email) {
      const email = data.user.email.toLowerCase().trim();
      
      // Verification: Check if the user is a resource in SIGPAD system
      const { data: resources } = await supabase
        .from('resources')
        .select('id, name, role, status')
        .ilike('email', email)
        .neq('status', 'baja')
        .limit(1);

      const resource = resources?.[0];

      let userDataToSync: any = null;

      if (resource) {
        const dbRole = (resource.role || '').toLowerCase();
        const role = dbRole.includes('gerente') ? 'gerente' : 'operador';
        userDataToSync = {
          email,
          role,
          id: resource.id,
          name: resource.name
        };
      } else {
        // Fallback: check authorized_users whitelist
        const { data: authUsers } = await supabase
          .from('authorized_users')
          .select('id, role')
          .ilike('email', email)
          .eq('status', 'approved')
          .limit(1);
          
        const authUser = authUsers?.[0];
        if (authUser) {
          userDataToSync = {
            email,
            role: authUser.role || 'gerente',
            id: authUser.id || 'GER-AUTO',
            name: 'Usuario Autorizado'
          };
        }
      }

      if (userDataToSync) {
        const response = NextResponse.redirect(`${origin}/${userDataToSync.role}`);
        
        // Tactical bypass for middleware and session persistence
        response.cookies.set('SIGPAD_bypass_active', 'true', { path: '/', maxAge: 3600 });
        
        response.cookies.set('SIGPAD_auth_temp', JSON.stringify(userDataToSync), { path: '/', maxAge: 60 });
        
        return response;
      } else {
        // If not a resource and not whitelisted, reject
        return NextResponse.redirect(`${origin}/login?error=Email no autorizado como personal.`);
      }
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Fallo de autenticación.`);
}
