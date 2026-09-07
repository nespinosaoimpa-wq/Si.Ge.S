import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  // Auto-heal status for nicoespinosa069@gmail.com
  await supabase
    .from('resources')
    .update({ status: 'activo' })
    .ilike('email', 'nicoespinosa069@gmail.com');

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, email, role, status, assigned_to, current_objective_id, current_shift_id, tenant_id')
    .ilike('email', 'nicoespinosa069@gmail.com');
  
  console.log("=== UPDATED RESOURCE FOR nicoespinosa069@gmail.com ===");
  console.log(JSON.stringify(resources, null, 2));
}

main().catch(console.error);
