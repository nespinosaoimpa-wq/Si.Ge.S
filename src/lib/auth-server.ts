import { NextRequest } from 'next/server';
import { createServiceClient } from './supabase-server';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: string;
  tenant_id: string | null;
  isSuperAdmin: boolean;
}

/**
 * Extrae y valida la información de sesión del usuario a partir de la cookie de SIGPAD.
 * Retorna null si la sesión no existe o es inválida.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const userCookie = request.cookies.get('SIGPAD_user');
  if (!userCookie || !userCookie.value) {
    return null;
  }

  let parsedUser: any = null;
  try {
    parsedUser = JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return null;
  }

  if (!parsedUser || !parsedUser.id) {
    return null;
  }

  let tenantId: string | null = parsedUser.tenant_id || parsedUser.user_metadata?.tenant_id || null;
  const role: string = parsedUser.role || parsedUser.user_metadata?.role || 'operador';
  const isSuperAdmin: boolean = role === 'superadmin' || parsedUser.user_metadata?.role === 'superadmin';

  // Si no se encontró tenant_id en la cookie y no es superadmin, consultar en DB
  if (!tenantId && !isSuperAdmin && parsedUser.id) {
    try {
      const supabase = createServiceClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', parsedUser.id)
        .maybeSingle();

      if (dbUser?.tenant_id) {
        tenantId = dbUser.tenant_id;
      }
    } catch (e) {
      console.warn('[AUTH_SERVER] Error al consultar tenant_id en DB:', e);
    }
  }

  return {
    id: parsedUser.id,
    email: parsedUser.email,
    role,
    tenant_id: tenantId,
    isSuperAdmin,
  };
}
