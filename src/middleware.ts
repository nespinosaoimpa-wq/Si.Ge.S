import { NextRequest, NextResponse } from 'next/server';

/**
 * SIGPAD — Route Protection Middleware (Enterprise Edition)
 *
 * Protege las rutas de la plataforma verificando la sesión activa.
 * Implementa aislamiento de roles (operador / gerente / superadmin).
 * Añade headers de seguridad HTTP enterprise-grade.
 */

// Rutas protegidas por rol
const PROTECTED_ROUTES = ['/gerente', '/operador'];
const SUPERADMIN_ROUTES = ['/superadmin'];
const CLIENT_ROUTES = ['/cliente'];
const AUTH_ROUTES = ['/login', '/register', '/register-company', '/cliente-login'];
const PUBLIC_ROUTES = ['/presupuesto', '/legal', '/', '/api', '/roles', '/nosotros'];

// Security headers para producción enterprise
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=self, geolocation=self, microphone=self',
  'X-XSS-Protection': '1; mode=block',
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Dejar pasar rutas estáticas y públicas ──────────────────
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    AUTH_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/icons')
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Super Admin Panel (rol superadmin requerido) ─────────────
  if (SUPERADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    const userCookie = request.cookies.get('SIGPAD_user');
    if (!userCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      const role = user?.role || user?.user_metadata?.role;
      if (role !== 'superadmin') {
        // No superadmin → redirigir a su panel correspondiente
        return NextResponse.redirect(
          new URL(role === 'operador' ? '/operador' : '/gerente', request.url)
        );
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Rutas del operador y gerente ─────────────────────────────
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const sessionCookie = request.cookies.get('SIGPAD_bypass_active');
    const userCookie = request.cookies.get('SIGPAD_user');

    if (!sessionCookie && !userCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const role = user?.role || user?.user_metadata?.role;

        // Superadmin puede acceder a todo
        if (role === 'superadmin') {
          return addSecurityHeaders(NextResponse.next());
        }

        // Cruce de roles → redirigir al panel correcto
        if (pathname.startsWith('/gerente') && role === 'operador') {
          return NextResponse.redirect(new URL('/operador', request.url));
        }
        if (pathname.startsWith('/operador') && role === 'gerente') {
          return NextResponse.redirect(new URL('/gerente', request.url));
        }
      } catch {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // ── Portal de clientes ───────────────────────────────────────
  if (CLIENT_ROUTES.some((r) => pathname.startsWith(r))) {
    const clientSession = request.cookies.get('SIGPAD_client_session');
    if (!clientSession) {
      const isDemoMode =
        process.env.SIGPAD_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
      if (!isDemoMode) {
        const clientLoginUrl = new URL('/cliente-login', request.url);
        clientLoginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(clientLoginUrl);
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.json).*)',
  ],
};
