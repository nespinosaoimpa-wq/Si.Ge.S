import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjIzMzcsImV4cCI6MjA5OTIzODMzN30.ELmTZRPoXjOXi5p8D_g1yQs925oak7oz1BYasLhJ7yc';

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
