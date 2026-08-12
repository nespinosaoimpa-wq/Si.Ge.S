import { createClient } from '@supabase/supabase-js';

// Servidor-solo: Utiliza la Service Role Key o ANON key para operaciones de servidor
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://reycvvpwbzpswgivvujz.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mIoDVjwnW15TD8UiBiK--Q_Xs17Pzsr';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) as any;
}
