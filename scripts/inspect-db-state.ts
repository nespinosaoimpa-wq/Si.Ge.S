import { createServiceClient } from '../src/lib/supabase-server';

async function main() {
  const supabase = createServiceClient();

  console.log("=== RESOURCES ===");
  const { data: resources, error: rErr } = await supabase
    .from('resources')
    .select('id, name, email, role, status, current_objective_id, assigned_to, latitude, longitude, tenant_id');
  if (rErr) console.error('Resource Error:', rErr);
  else console.log(JSON.stringify(resources, null, 2));

  console.log("\n=== OBJECTIVES ===");
  const { data: objectives, error: oErr } = await supabase
    .from('objectives')
    .select('id, name, address, latitude, longitude, geofence_radius, tenant_id');
  if (oErr) console.error('Objective Error:', oErr);
  else console.log(JSON.stringify(objectives, null, 2));
}

main().catch(console.error);
