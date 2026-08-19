-- ==============================================================================
-- SIGPAD OS - Migración de Seguridad: Fix Security Definer Views
-- ==============================================================================
-- Resuelve las 2 advertencias críticas del Asesor de Seguridad (Security Advisor) de Supabase.
-- Al habilitar `security_invoker = true`, las vistas respetan estrictamente las políticas RLS
-- de la persona o consulta que las invoca.

ALTER VIEW public.saas_tenant_metrics SET (security_invoker = true);
ALTER VIEW public.payroll_summary SET (security_invoker = true);
