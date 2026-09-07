const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SIGPAD_TEST_TENANT_ID = '7f1fd036-6a82-47ab-aa2a-964c081e285b';

async function testMapQueries() {
  console.log("=== TESTING DASHBOARD MAP ROUTE QUERIES ===");

  // 1. Objectives
  const { data: objs, error: objErr } = await supabase.from('objectives').select('*').eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log("1. objectives:", objErr ? objErr : `OK (${objs.length} rows)`);

  // 2. Resources
  const { data: res, error: resErr } = await supabase.from('resources').select('*').eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log("2. resources:", resErr ? resErr : `OK (${res.length} rows)`);

  // 3. Guard Shifts
  const { data: shifts, error: shiftErr } = await supabase.from('guard_shifts').select('*').eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log("3. guard_shifts:", shiftErr ? shiftErr : `OK (${shifts.length} rows)`);

  // 4. Shift Requirements
  const { data: reqs, error: reqErr } = await supabase.from('shift_requirements').select('*').eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log("4. shift_requirements:", reqErr ? reqErr : `OK (${reqs ? reqs.length : 0} rows)`);

  // 5. Alarms
  const { data: alarms, error: alarmErr } = await supabase.from('alarms').select('*').eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log("5. alarms:", alarmErr ? alarmErr : `OK (${alarms ? alarms.length : 0} rows)`);

  // 6. Check objectives columns
  if (objs && objs.length > 0) {
    console.log("Objectives columns:", Object.keys(objs[0]));
  }
}

testMapQueries().catch(console.error);
