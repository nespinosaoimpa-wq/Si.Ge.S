import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  const { data: updatedRes, error: resErr } = await supabase
    .from('resources')
    .update({
      current_objective_id: 'fb14bfd5-7821-406d-97c0-e66edfb1f6a1'
    })
    .ilike('email', 'nicoespinosa069@gmail.com')
    .select();

  if (resErr) console.error("Error updating resource:", resErr);
  else console.log("Updated Resource:", JSON.stringify(updatedRes, null, 2));
}

main().catch(console.error);
