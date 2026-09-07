import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  console.log("=== INSPECTING USER nicoespinosa069@gmail.com ===");
  const { data: resources, error: resErr } = await supabase
    .from('resources')
    .select('*')
    .ilike('email', 'nicoespinosa069@gmail.com');
  
  console.log("Resources:", JSON.stringify(resources, null, 2));

  console.log("\n=== INSPECTING OBJECTIVES ===");
  const { data: objectives, error: objErr } = await supabase
    .from('objectives')
    .select('*');
  
  console.log("All Objectives:", JSON.stringify(objectives, null, 2));

  console.log("\n=== INSPECTING OBJECTIVE RESOURCES JUNCTION ===");
  const { data: objRes } = await supabase
    .from('objective_resources')
    .select('*');
  console.log("Objective Resources:", JSON.stringify(objRes, null, 2));

  console.log("\n=== INSPECTING RECENT GUARD SHIFTS ===");
  const { data: guardShifts } = await supabase
    .from('guard_shifts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("Recent Guard Shifts:", JSON.stringify(guardShifts, null, 2));
}

main().catch(console.error);
