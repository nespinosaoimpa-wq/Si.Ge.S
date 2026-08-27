/**
 * SIGPAD — resolve-tenant.ts
 * Función centralizada de resolución de tenant_id para API Routes.
 *
 * REGLA DE ORO: NUNCA cae al tenant maestro si el usuario es gerente u operador.
 * Si no se puede resolver el tenant, retorna null para que la ruta devuelva 403.
 *
 * Orden de cascada:
 *  1. Cookie SIGPAD_user → tenant_id directo
 *  2. DB: authorized_users.tenant_id WHERE email = userEmail (NOT NULL)
 *  3. DB: resources.tenant_id WHERE email = userEmail (NOT NULL)
 *  4. DB: users.tenant_id WHERE id = userId (NOT NULL)
 *  5. DB: tenants.id WHERE admin_email = userEmail
 *  → Si ninguno resuelve: null (el caller debe retornar 403)
 */

import { createServiceClient } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

export const MASTER_TENANT_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

export interface ResolvedTenant {
  tenantId: string | null;
  isSuper: boolean;
  userId: string | null;
  userEmail: string | null;
  userRole: string;
  userName: string | null;
}

/**
 * Resuelve el contexto de tenant desde la cookie SIGPAD_user.
 * Para SuperAdmin (sigpad.info@gmail.com con rol superadmin): isSuper=true, tenantId puede ser null.
 * Para gerente/operador: tenantId DEBE ser un UUID válido de empresa real.
 * Si no se puede resolver: tenantId=null y el caller debe retornar 403.
 */
export async function resolveTenantFromRequest(req: NextRequest): Promise<ResolvedTenant | null> {
  const userCookie = req.cookies.get('SIGPAD_user');
  if (!userCookie?.value) return null;

  let cookieUser: any;
  try {
    cookieUser = JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return null;
  }

  const userId: string | null = cookieUser?.id || null;
  const userEmail: string | null = (cookieUser?.email || '').toLowerCase().trim() || null;
  const userRole: string = (cookieUser?.role || cookieUser?.user_metadata?.role || 'operador').toLowerCase();
  const userName: string | null = cookieUser?.name || cookieUser?.user_metadata?.full_name || null;

  // SuperAdmin con email maestro: acceso global sin restricción de tenant
  const isSuperAdminEmail = userEmail === 'sigpad.info@gmail.com';
  const isSuperRole = userRole === 'superadmin';
  const isSuper = isSuperAdminEmail && isSuperRole;

  if (isSuper) {
    return {
      tenantId: null, // SuperAdmin ve todo sin filtro
      isSuper: true,
      userId,
      userEmail,
      userRole,
      userName,
    };
  }

  // Paso 1: Tenant de la cookie (solo si no es el maestro)
  const cookieTenantId = cookieUser?.tenant_id || cookieUser?.user_metadata?.tenant_id || null;
  if (cookieTenantId && cookieTenantId !== MASTER_TENANT_ID && isValidUUID(cookieTenantId)) {
    return {
      tenantId: cookieTenantId,
      isSuper: false,
      userId,
      userEmail,
      userRole,
      userName,
    };
  }

  // Pasos 2-5: Resolución desde base de datos
  if (!userId && !userEmail) return null;

  try {
    const supabase = createServiceClient();

    // Paso 2: authorized_users
    if (userEmail) {
      const { data: authU } = await supabase
        .from('authorized_users')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .neq('tenant_id', MASTER_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (authU?.tenant_id && isValidUUID(authU.tenant_id)) {
        return { tenantId: authU.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    // Paso 3: resources
    if (userEmail) {
      const { data: res } = await supabase
        .from('resources')
        .select('tenant_id')
        .ilike('email', userEmail)
        .not('tenant_id', 'is', null)
        .neq('tenant_id', MASTER_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res?.tenant_id && isValidUUID(res.tenant_id)) {
        return { tenantId: res.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    // Paso 4: users (por ID)
    if (userId && isValidUUID(userId)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .not('tenant_id', 'is', null)
        .neq('tenant_id', MASTER_TENANT_ID)
        .maybeSingle();
      if (dbUser?.tenant_id && isValidUUID(dbUser.tenant_id)) {
        return { tenantId: dbUser.tenant_id, isSuper: false, userId, userEmail, userRole, userName };
      }
    }

    // Paso 5: tenants por admin_email
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

  // No se pudo resolver: el caller debe devolver 403
  return {
    tenantId: null,
    isSuper: false,
    userId,
    userEmail,
    userRole,
    userName,
  };
}

/** Valida que una cadena sea un UUID v4 válido */
export function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
