import { createClient } from '@supabase/supabase-js';

// Servidor-solo: Utiliza la Service Role Key para operaciones que requieren bypass de RLS
// ¡IMPORTANTE! NUNCA usar este cliente en componentes cliente (use client)
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Missing Supabase Server Keys. Backend operations relying on Service Role might fail.');
    // Fallback a un cliente dummy si no hay llaves para evitar crashes en build/dev
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) as any;
}
