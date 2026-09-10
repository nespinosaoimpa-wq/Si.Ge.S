import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const FALLBACK_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(FALLBACK_URL, FALLBACK_SERVICE);

async function main() {
  const emails = ['sigpadfer@gmail.com', 'nicoespinosa069@gmail.com', 'segalvittorio@gmail.com'];
  
  const { data: resources } = await supabase
    .from('resources')
    .select('id, assigned_to, email, name')
    .in('email', emails);

  if (!resources || resources.length === 0) return;

  const targetIds: string[] = [];
  resources.forEach(r => {
    if (r.id) targetIds.push(r.id);
    if (r.assigned_to) targetIds.push(r.assigned_to);
  });

  console.log("All target IDs to purge:", targetIds);

  // 1. Reset current_shift_id on resources
  await supabase
    .from('resources')
    .update({ current_shift_id: null, status: 'activo' })
    .in('id', resources.map(r => r.id));

  // 2. Delete ALL shifts for these IDs
  for (const id of targetIds) {
    await supabase.from('guard_shifts').delete().eq('operator_id', id);
    await supabase.from('guard_shifts').delete().eq('resource_id', id);
    await supabase.from('guard_book_entries').delete().eq('operator_id', id);
    await supabase.from('guard_book_entries').delete().eq('resource_id', id);
    await supabase.from('incidents').delete().eq('operator_id', id);
    await supabase.from('incidents').delete().eq('resource_id', id);
    await supabase.from('alarms').delete().eq('triggered_by', id);
  }

  // 3. Verify clean state of guard_shifts
  const { data: remainingShifts } = await supabase
    .from('guard_shifts')
    .select('id, operator_id, status, checkin_time')
    .in('operator_id', targetIds);

  console.log("=== REMAINING SHIFTS FOR OPERATORS (SHOULD BE EMPTY) ===");
  console.log(JSON.stringify(remainingShifts, null, 2));

  const { data: cleanRes } = await supabase
    .from('resources')
    .select('id, name, email, status, current_shift_id, current_objective_id')
    .in('email', emails);

  console.log("=== CLEANED OPERATORS SUMMARY ===");
  console.log(JSON.stringify(cleanRes, null, 2));
}

main().catch(console.error);
