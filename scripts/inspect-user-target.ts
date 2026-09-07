import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  // Update status to 'activo' for these specific operators in the database
  const emails = ['sigpadfer@gmail.com', 'nicoespinosa069@gmail.com', 'segalvittorio@gmail.com'];
  
  const { data: updated, error: updateErr } = await supabase
    .from('resources')
    .update({ status: 'activo' })
    .in('email', emails)
    .select();

  console.log("=== UPDATED RESOURCES ===");
  console.log(JSON.stringify(updated, null, 2));

  // Check all resources to make sure none have 'disponible' or stale status blocking them
  const { data: allResources } = await supabase
    .from('resources')
    .select('id, name, email, role, status, tenant_id')
    .neq('status', 'baja');

  console.log("=== ALL ACTIVE/DISPONIBLE RESOURCES IN DB ===");
  console.log(JSON.stringify(allResources, null, 2));
}

main().catch(console.error);
