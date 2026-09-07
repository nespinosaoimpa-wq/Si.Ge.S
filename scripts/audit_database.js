const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgzkudwuukctaldwcekr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function auditTable(tableName) {
  console.log(`\n========================================`);
  console.log(`TABLE: ${tableName}`);
  console.log(`========================================`);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Error querying ${tableName}:`, error.message);
    return;
  }
  console.log(`Total rows: ${data ? data.length : 0}`);
  if (data && data.length > 0) {
    console.log(`Columns:`, Object.keys(data[0]));
    const byTenant = {};
    let nullCount = 0;
    data.forEach(row => {
      const t = row.tenant_id || 'NULL_ORPHAN';
      if (!row.tenant_id) nullCount++;
      byTenant[t] = (byTenant[t] || 0) + 1;
    });
    console.log(`Distribution by tenant_id:`, byTenant);
    if (nullCount > 0) {
      console.log(`WARNING: Found ${nullCount} orphan rows with NULL tenant_id in ${tableName}!`);
      const orphans = data.filter(r => !r.tenant_id);
      console.log(`Orphans sample:`, JSON.stringify(orphans.slice(0, 5), null, 2));
    }
  }
}

async function main() {
  const tables = [
    'tenants',
    'authorized_users',
    'resources',
    'objectives',
    'resource_inventory',
    'guard_shifts',
    'guard_book_entries',
    'shift_checklists',
    'audit_logs'
  ];

  for (const table of tables) {
    await auditTable(table);
  }
}

main().catch(console.error);
