/**
 * SIGPAD — resolve-tenant.ts
 * Función centralizada de resolución de tenant_id para API Routes.
 */

import { createServiceClient } from '@/lib/supabase-server';

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
    if (!rawUserCookie) return null;

    let cookieUser: any;
    try {
      cookieUser = JSON.parse(decodeURIComponent(rawUserCookie));
    } catch {
      try {
        cookieUser = JSON.parse(rawUserCookie);
      } catch {
        return null;
      }
    }

    const userId: string | null = cookieUser?.id || null;
    const userEmail: string | null = (cookieUser?.email || '').toLowerCase().trim() || null;
    const userRole: string = (cookieUser?.role || cookieUser?.user_metadata?.role || 'operador').toLowerCase();
    const userName: string | null = cookieUser?.name || cookieUser?.user_metadata?.full_name || null;

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
    if (cookieTenantId && isValidUUID(cookieTenantId)) {
      return {
        tenantId: cookieTenantId,
        isSuper: false,
        userId,
        userEmail,
        userRole,
        userName,
      };
    }

    if (!userId && !userEmail) return null;

    const supabase = createServiceClient();

    if (userEmail) {
      const { data: authU } = await supabase
        .from('authorized_users')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (authU?.tenant_id && isValidUUID(authU.tenant_id)) {
        return { tenantId: authU.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    if (userEmail) {
      const { data: res } = await supabase
        .from('resources')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res?.tenant_id && isValidUUID(res.tenant_id)) {
        return { tenantId: res.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    if (userId && isValidUUID(userId)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .not('tenant_id', 'is', null)
        .maybeSingle();
      if (dbUser?.tenant_id && isValidUUID(dbUser.tenant_id)) {
        return { tenantId: dbUser.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    if (userEmail) {
      const { data: t } = await supabase
        .from('tenants')
        .select('id')
        .ilike('admin_email', userEmail)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (t?.id && isValidUUID(t.id)) {
        return { tenantId: t.id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }
  } catch (err: any) {
    console.error('[resolve-tenant] Error en cascada de resolución:', err?.message);
  }

  return {
    tenantId: null,
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
