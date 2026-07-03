import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Role → allowed base paths
const ROLE_PATHS: Record<string, string> = {
  gerente: '/gerente',
  operador: '/operador',
  cliente: '/cliente',
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const path = request.nextUrl.pathname

  // 🛡️ TACTICAL BYPASS: Allow access if the bypass cookie is active (Master PIN sessions)
  const isBypassActive = request.cookies.get('SIGPAD_bypass_active')?.value === 'true'

  if (!supabaseUrl || !supabaseAnonKey) {
    if (
      !isBypassActive &&
      (path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente'))
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isProtectedPath =
    path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente')

  // 1. No session & no bypass → redirect to login
  if (!session && !isBypassActive && isProtectedPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. If authenticated, enforce role-based access
  if (session && isProtectedPath && !isBypassActive) {
    try {
      // Fetch role from users table (set during registration/setup)
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const role: string | null = userRecord?.role ?? session.user.user_metadata?.role ?? null

      if (role && ROLE_PATHS[role]) {
        const allowedPath = ROLE_PATHS[role]
        if (!path.startsWith(allowedPath)) {
          // Role mismatch → redirect to their own dashboard dashboard (e.g. Operator trying /gerente)
          return NextResponse.redirect(new URL(allowedPath, request.url))
        }
      } else {
        // 🔒 PRODUCTION HARDENING: No identified role → redirect to login for safety
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch (e) {
      // On DB error, we stay safe and redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 3. Authenticated user trying to access login → redirect to root
  if (session && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest|.*\\.webmanifest$|.*\\.png$|.*\\.ico$).*)',
  ],
}
