const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SIGPAD_TEST_TENANT_ID = '7f1fd036-6a82-47ab-aa2a-964c081e285b';

async function verifyAllSubmenus() {
  console.log("=== COMPREHENSIVE SUB-MENU DATA AUDIT FOR SIGPAD TEST ===");

  // 1. Personal (Employees)
  const { data: employees, error: empErr } = await supabase
    .from('resources')
    .select('*, assigned_objective:objectives(name)')
    .neq('status', 'baja')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n1. Personal/Employees: ${employees ? employees.length : 0} items`);
  if (empErr) console.error("Error fetching employees:", empErr);
  else console.log("Sample:", employees ? employees.map(e => ({ id: e.id, name: e.name, role: e.role })) : []);

  // 2. Objetivos
  const { data: objectives, error: objErr } = await supabase
    .from('objectives')
    .select('*')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n2. Objetivos: ${objectives ? objectives.length : 0} items`);
  if (objErr) console.error("Error fetching objectives:", objErr);
  else console.log("Sample:", objectives ? objectives.map(o => ({ id: o.id, name: o.name, is_active: o.is_active })) : []);

  // 3. Libro de Novedades (Guard Book)
  const { data: guardBook, error: gbErr } = await supabase
    .from('guard_book_entries')
    .select('*')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n3. Libro de Novedades: ${guardBook ? guardBook.length : 0} items`);
  if (gbErr) console.error("Error fetching guard book:", gbErr);
  else console.log("Sample:", guardBook ? guardBook.map(g => ({ id: g.id, type: g.entry_type, content: g.content })) : []);

  // 4. Logística (Inventory)
  const { data: inventory, error: invErr } = await supabase
    .from('resource_inventory')
    .select('*')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n4. Logística/Inventario: ${inventory ? inventory.length : 0} items`);
  if (invErr) console.error("Error fetching inventory:", invErr);
  else console.log("Sample:", inventory ? inventory.map(i => ({ id: i.id, name: i.item_name, status: i.status })) : []);

  // 5. Planillas / Turnos (Guard Shifts)
  const { data: shifts, error: shiftErr } = await supabase
    .from('guard_shifts')
    .select('*')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n5. Planillas/Turnos: ${shifts ? shifts.length : 0} items`);
  if (shiftErr) console.error("Error fetching shifts:", shiftErr);
  else console.log("Sample:", shifts ? shifts.map(s => ({ id: s.id, status: s.status, checkin: s.checkin_time })) : []);

  // 6. Accesos (Authorized Users)
  const { data: users, error: userErr } = await supabase
    .from('authorized_users')
    .select('*')
    .eq('tenant_id', SIGPAD_TEST_TENANT_ID);
  console.log(`\n6. Accesos/Usuarios: ${users ? users.length : 0} items`);
  if (userErr) console.error("Error fetching authorized users:", userErr);
  else console.log("Sample:", users ? users.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.status })) : []);

  console.log("\n=== ALL SUBMENUS AUDITED SUCCESSFULLY ===");
}

verifyAllSubmenus().catch(console.error);
