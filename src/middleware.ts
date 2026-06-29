import { NextRequest, NextResponse } from 'next/server';

/**
 * Si.Ge.S — Route Protection Middleware
 *
 * Protege las rutas de la plataforma verificando la sesión activa.
 * Los usuarios no autenticados son redirigidos a /login.
 * La validación de ROL se hace server-side para evitar acceso cruzado.
 */

// Rutas que requieren autenticación de operador/gerente
const PROTECTED_ROUTES = ['/gerente', '/operador'];

// Rutas que requieren sesión de cliente final
const CLIENT_ROUTES = ['/cliente'];

// Rutas de autenticación (no redirigir si ya estás aquí)
const AUTH_ROUTES = ['/login', '/register', '/cliente-login'];

// Rutas públicas que nunca requieren auth
const PUBLIC_ROUTES = ['/presupuesto', '/legal', '/', '/api', '/roles'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Dejar pasar rutas públicas y de API ──────────────────────────────
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    AUTH_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next();
  }

  // ── Rutas protegidas del operador y gerente ──────────────────────────
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const sessionCookie = request.cookies.get('siges_bypass_active');
    const userCookie = request.cookies.get('siges_user');

    // Si no hay sesión, redirigir al login
    if (!sessionCookie && !userCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validación de ROL: un operador no puede acceder a /gerente y viceversa
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const role = user?.role || user?.user_metadata?.role;

        if (pathname.startsWith('/gerente') && role === 'operador') {
          return NextResponse.redirect(new URL('/operador', request.url));
        }
        if (pathname.startsWith('/operador') && role === 'gerente') {
          return NextResponse.redirect(new URL('/gerente', request.url));
        }
      } catch {
        // Cookie malformada → redirigir al login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  }

  // ── Rutas del portal de clientes ─────────────────────────────────────
  if (CLIENT_ROUTES.some((r) => pathname.startsWith(r))) {
    const clientSession = request.cookies.get('siges_client_session');

    // Si no hay sesión de cliente, redirigir al login de cliente
    if (!clientSession) {
      // En modo demo/desarrollo, permitir acceso libre al portal de cliente
      const isDemoMode = process.env.SIGES_DEMO_MODE === 'true' ||
                         process.env.NODE_ENV === 'development';
      if (!isDemoMode) {
        const clientLoginUrl = new URL('/cliente-login', request.url);
        clientLoginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(clientLoginUrl);
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar middleware a todas las rutas excepto archivos estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.json).*)',
  ],
};
