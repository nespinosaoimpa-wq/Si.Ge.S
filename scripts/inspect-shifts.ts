import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  const resourceId = 'S-8117';
  const authId = '7223cb58-2a6e-4023-9ebc-6579eb099625';
  
  console.log("=== GUARD SHIFTS FOR S-8117 / AUTH ID ===");
  const { data: shifts } = await supabase
    .from('guard_shifts')
    .select('*, objectives(name, latitude, longitude)')
    .or(`operator_id.eq.${resourceId},operator_id.eq.${authId}`);
  console.log("Shifts:", JSON.stringify(shifts, null, 2));

  console.log("\n=== OBJECTIVE RESOURCES FOR S-8117 ===");
  const { data: objRes } = await supabase
    .from('objective_resources')
    .select('*, objectives(name, latitude, longitude)')
    .or(`resource_id.eq.${resourceId},resource_id.eq.${authId}`);
  console.log("ObjRes:", JSON.stringify(objRes, null, 2));

  console.log("\n=== SHIFT REQUIREMENTS FOR S-8117 ===");
  const { data: reqs } = await supabase
    .from('shift_requirements')
    .select('*, objectives(name, latitude, longitude)')
    .or(`assigned_operator_id.eq.${resourceId},assigned_operator_id.eq.${authId}`);
  console.log("ShiftReqs:", JSON.stringify(reqs, null, 2));
}

main().catch(console.error);
