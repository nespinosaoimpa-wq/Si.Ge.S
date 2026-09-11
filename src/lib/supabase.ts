import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjIzMzcsImV4cCI6MjA5OTIzODMzN30.ELmTZRPoXjOXi5p8D_g1yQs925oak7oz1BYasLhJ7yc';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

export const isConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Generates a W3C Trace Context traceparent header (00-traceId-spanId-flags)
 * Propagates client trace_id to match Supabase server logs 1:1.
 */
export function generateW3CTraceParent(): string {
  const hex = (len: number) => {
    let result = '';
    while (result.length < len) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result.slice(0, len);
  };
  return `00-${hex(32)}-${hex(16)}-01`;
}

export const createClient = () => {
  const traceParent = generateW3CTraceParent();
  const traceId = traceParent.split('-')[1];

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'traceparent': traceParent,
        'x-sigpad-trace-id': traceId
      }
    }
  });
};

// Singleton instance
let _supabase: any = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    return createClient() as any;
  }
  
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase as any;
})() as any;
