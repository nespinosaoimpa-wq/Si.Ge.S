import { createServiceClient } from '../src/lib/supabase-server';

async function main() {
  const supabase = createServiceClient();

  console.log("=== 1. SYNCING OBJECTIVE COORDINATES & GEOFENCES ===");
  // Sync Edificio Central (fb14bfd5-7821-406d-97c0-e66edfb1f6a1)
  const { error: oErr1 } = await supabase
    .from('objectives')
    .update({
      latitude: -31.625156,
      longitude: -60.688247,
      geofence_radius: 500
    })
    .eq('id', 'fb14bfd5-7821-406d-97c0-e66edfb1f6a1');
  if (oErr1) console.error("Error updating Edificio Central:", oErr1);
  else console.log("✅ Synchronized Edificio Central coordinates & 500m geofence.");

  // Sync Edificio central de Prueba (OBJ-50877)
  const { error: oErr2 } = await supabase
    .from('objectives')
    .update({
      latitude: -31.625156,
      longitude: -60.688247,
      geofence_radius: 500
    })
    .eq('id', 'OBJ-50877');
  if (oErr2) console.error("Error updating Edificio central de Prueba:", oErr2);
  else console.log("✅ Synchronized Edificio central de Prueba coordinates & 500m geofence.");

  console.log("\n=== 2. PURGING GHOST/STALE ACTIVE SHIFTS ===");
  // Close any old open shifts (older than 12 hours) by setting checkout_time = checkin_time + 8 hours
  const TwelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: staleShifts } = await supabase
    .from('guard_shifts')
    .select('id, checkin_time, operator_id')
    .is('checkout_time', null)
    .lt('checkin_time', TwelveHoursAgo);

  if (staleShifts && staleShifts.length > 0) {
    for (const shift of staleShifts) {
      const checkout = new Date(new Date(shift.checkin_time).getTime() + 8 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('guard_shifts')
        .update({ checkout_time: checkout, status: 'completado' })
        .eq('id', shift.id);
      console.log(`✅ Closed stale shift ${shift.id} for operator ${shift.operator_id}`);
    }
  } else {
    console.log("✅ No stale active shifts older than 12h found.");
  }

  console.log("\n=== 3. AUTO-HEAL OPERATOR STATUSES ===");
  // Get all active shifts right now
  const { data: activeShifts } = await supabase
    .from('guard_shifts')
    .select('operator_id')
    .is('checkout_time', null)
    .in('status', ['activo', 'active']);

  const activeOpIds = new Set((activeShifts || []).map(s => String(s.operator_id).toLowerCase()));

  // Fetch all resources in tenant
  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, role, status, email')
    .neq('status', 'baja');

  if (resources) {
    for (const r of resources) {
      const roleLower = (r.role || '').toLowerCase();
      // Skip managers from status override
      if (['gerente', 'administrador', 'admin', 'director'].includes(roleLower)) continue;

      const isOpActive = activeOpIds.has(String(r.id).toLowerCase());
      const expectedStatus = isOpActive ? 'activo' : 'disponible';

      if (r.status !== expectedStatus) {
        await supabase
          .from('resources')
          .update({ status: expectedStatus })
          .eq('id', r.id);
        console.log(`✅ Healed status for ${r.name} (${r.email}): ${r.status} ➔ ${expectedStatus}`);
      }
    }
  }

  console.log("\n=== 4. VERIFYING VITTORIO, FERNANDO & NICOLAS ===");
  const { data: testUsers } = await supabase
    .from('resources')
    .select('id, name, email, role, status, current_objective_id')
    .in('email', ['segalvittorio@gmail.com', 'fernando@gmail.com', 'nicoespinosa069@gmail.com', 'nespinosa.oimpa@gmail.com']);

  console.table(testUsers);
  console.log("\n✅ Database purge and healing script executed successfully.");
}

main().catch(console.error);
