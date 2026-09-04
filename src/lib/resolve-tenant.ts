/**
 * SIGPAD — resolve-tenant.ts
 * Función centralizada de resolución de tenant_id para API Routes de SIGPAD.
 *
 * REGLA DE ORO: Las peticiones en la plataforma SIGPAD pertenecen a SIGPAD TEST ('7f1fd036-6a82-47ab-aa2a-964c081e285b')
 * o a su respectiva empresa SIGPAD, incluso si el usuario utiliza el mismo email en 704.
 */

import { createServiceClient } from '@/lib/supabase-server';

export const SIGPAD_TEST_TENANT_ID = '7f1fd036-6a82-47ab-aa2a-964c081e285b';
export const MASTER_TENANT_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

export interface ResolvedTenant {
  tenantId: string | null;
  isSuper: boolean;
  userId: string | null;
  userEmail: string | null;
  userRole: string;
  userName: string | null;
}

function getCookieFromRequest(req: any, name: string): string | null {
  try {
    if (!req) return null;
    if (req.cookies && typeof req.cookies.get === 'function') {
      const cookieObj = req.cookies.get(name);
      if (cookieObj?.value) return cookieObj.value;
      if (typeof cookieObj === 'string') return cookieObj;
    }
    const cookieHeader = req.headers?.get ? req.headers.get('cookie') : (req.headers?.cookie || '');
    if (cookieHeader && typeof cookieHeader === 'string') {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch (e) {}
  return null;
}

export async function resolveTenantFromRequest(req: any): Promise<ResolvedTenant | null> {
  try {
    const rawUserCookie = getCookieFromRequest(req, 'SIGPAD_user') || getCookieFromRequest(req, '704_user') || getCookieFromRequest(req, 'SPS_user');

    let userId: string | null = null;
    let userEmail: string | null = null;
    let userRole: string = 'operador';
    let userName: string | null = null;

    if (rawUserCookie) {
      let cookieUser: any;
      try {
        cookieUser = JSON.parse(decodeURIComponent(rawUserCookie));
      } catch {
        try {
          cookieUser = JSON.parse(rawUserCookie);
        } catch {}
      }

      if (cookieUser) {
        userId = cookieUser?.id || null;
        userEmail = (cookieUser?.email || '').toLowerCase().trim() || null;
        userRole = (cookieUser?.role || cookieUser?.user_metadata?.role || 'operador').toLowerCase();
        userName = cookieUser?.name || cookieUser?.user_metadata?.full_name || null;

        const isSuperAdminEmail = userEmail === 'sigpad.info@gmail.com';
        const isSuperRole = userRole === 'superadmin';
        const isSuper = isSuperAdminEmail && isSuperRole;

        if (isSuper) {
          return {
            tenantId: null,
            isSuper: true,
            userId,
            userEmail,
            userRole,
            userName,
          };
        }

        const cookieTenantId = cookieUser?.tenant_id || cookieUser?.user_metadata?.tenant_id || null;
        // If cookie explicitly specifies a valid SIGPAD tenant, use it
        if (cookieTenantId && isValidUUID(cookieTenantId) && cookieTenantId !== MASTER_TENANT_ID) {
          return {
            tenantId: cookieTenantId,
            isSuper: false,
            userId,
            userEmail,
            userRole,
            userName,
          };
        }
      }
    }

    // Default SIGPAD Application Context (SIGPAD TEST)
    return {
      tenantId: SIGPAD_TEST_TENANT_ID,
      isSuper: false,
      userId,
      userEmail,
      userRole,
      userName,
    };
  } catch (err: any) {
    console.error('[resolve-tenant SIGPAD] Error:', err?.message);
  }

  return {
    tenantId: SIGPAD_TEST_TENANT_ID,
    isSuper: false,
    userId: null,
    userEmail: null,
    userRole: 'operador',
    userName: null,
  };
}

export function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
