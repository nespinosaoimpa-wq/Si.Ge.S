'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * useTenant — Hook que provee el contexto del inquilino (empresa)
 * actual al componente. Usado en toda la consola de gerente para
 * filtrar datos automáticamente por tenant_id.
 */

export interface TenantContext {
  tenantId: string | null;
  tenantName: string | null;
  billingStatus: string | null;
  planTier: string | null;
  isLoading: boolean;
  isSuspended: boolean;
  isTrialExpired: boolean;
}

const DEFAULT_CONTEXT: TenantContext = {
  tenantId: null,
  tenantName: null,
  billingStatus: null,
  planTier: null,
  isLoading: true,
  isSuspended: false,
  isTrialExpired: false,
};

export function useTenant(): TenantContext {
  const [ctx, setCtx] = useState<TenantContext>(DEFAULT_CONTEXT);

  useEffect(() => {
    async function loadTenant() {
      try {
        // 1. Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCtx({ ...DEFAULT_CONTEXT, isLoading: false });
          return;
        }

        // 2. Get user row with tenant_id
        const { data: userRow } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', user.id)
          .single();

        if (!userRow?.tenant_id) {
          setCtx({ ...DEFAULT_CONTEXT, isLoading: false });
          return;
        }

        // 3. Get tenant details
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, billing_status, plan_tier, trial_ends_at')
          .eq('id', userRow.tenant_id)
          .single();

        if (!tenant) {
          setCtx({ ...DEFAULT_CONTEXT, isLoading: false });
          return;
        }

        const isSuspended = tenant.billing_status === 'suspended';
        const isTrialExpired =
          tenant.billing_status === 'trial' &&
          tenant.trial_ends_at &&
          new Date(tenant.trial_ends_at) < new Date();

        setCtx({
          tenantId: tenant.id,
          tenantName: tenant.name,
          billingStatus: tenant.billing_status,
          planTier: tenant.plan_tier,
          isLoading: false,
          isSuspended,
          isTrialExpired: !!isTrialExpired,
        });
      } catch (err) {
        console.error('[useTenant] Error loading tenant:', err);
        setCtx({ ...DEFAULT_CONTEXT, isLoading: false });
      }
    }

    loadTenant();
  }, []);

  return ctx;
}

/**
 * Helper: añade el tenant_id activo a cualquier query de Supabase.
 * Uso: supabase.from('resources').select('*').then(withTenant(tenantId))
 * O simplemente incluir el tenant_id en la query manualmente.
 *
 * Dado que las RLS policies filtran automáticamente por el JWT del
 * usuario autenticado vía get_current_tenant_id(), este hook es
 * principalmente para UI logic y no para filtrado de seguridad.
 */
export function buildTenantFilter(tenantId: string | null) {
  return function <T extends { eq: (col: string, val: string) => T }>(query: T): T {
    if (!tenantId) return query;
    return query.eq('tenant_id', tenantId);
  };
}
