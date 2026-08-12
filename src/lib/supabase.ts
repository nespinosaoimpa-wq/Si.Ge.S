import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = 'https://reycvvpwbzpswgivvujz.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'sb_publishable_mIoDVjwnW15TD8UiBiK--Q_Xs17Pzsr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

// Singleton instance
let _supabase: any = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey) as any;
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase as any;
})() as any;
