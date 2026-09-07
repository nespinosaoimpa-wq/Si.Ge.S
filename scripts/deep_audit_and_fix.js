const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgzkudwuukctaldwcekr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnemt1ZHd1dWtjdGFsZHdjZWtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY2MjMzNywiZXhwIjoyMDk5MjM4MzM3fQ.ECHgqrp1hXeemc4v-66CoC3HbwaCM1SbU09HdOO2QmI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TENANT_1 = 'a1b2c3d4-0001-0001-0001-000000000001'; // Seguridad Norte S.A.
const TENANT_2 = 'a1b2c3d4-0002-0002-0002-000000000002'; // Vigilancia Patagonia SRL
const TENANT_3 = 'a1b2c3d4-0003-0003-0003-000000000003'; // SecureForce México S.A. de C.V.
const TENANT_4 = '7f1fd036-6a82-47ab-aa2a-964c081e285b'; // SIGPAD TEST

async function runFixes() {
  console.log("=== EXECUTING SUPABASE DATA REMEDIATION & MULTI-TENANT ORGANIZER ===");

  // 1. Fix Orphan Objectives
  const { data: orphanObjs } = await supabase.from('objectives').select('*').is('tenant_id', null);
  if (orphanObjs && orphanObjs.length > 0) {
    console.log(`Fixing ${orphanObjs.length} orphan objectives -> assigning to ${TENANT_1}`);
    const { error: objErr } = await supabase
      .from('objectives')
      .update({ tenant_id: TENANT_1 })
      .is('tenant_id', null);
    if (objErr) console.error("Error fixing orphan objectives:", objErr);
    else console.log("Successfully fixed orphan objectives.");
  } else {
    console.log("No orphan objectives found.");
  }

  // 2. Fix Orphan Guard Shifts
  const { data: orphanShifts } = await supabase.from('guard_shifts').select('*').is('tenant_id', null);
  if (orphanShifts && orphanShifts.length > 0) {
    console.log(`Fixing ${orphanShifts.length} orphan guard_shifts -> assigning to ${TENANT_4}`);
    const { error: shiftErr } = await supabase
      .from('guard_shifts')
      .update({ tenant_id: TENANT_4 })
      .is('tenant_id', null);
    if (shiftErr) console.error("Error fixing orphan guard_shifts:", shiftErr);
    else console.log("Successfully fixed orphan guard_shifts.");
  } else {
    console.log("No orphan guard shifts found.");
  }

  // 3. Seed missing data for Tenant 2 (Vigilancia Patagonia SRL)
  console.log("\n--- Checking and Seeding Tenant 2: Vigilancia Patagonia SRL ---");
  const { data: t2Users } = await supabase.from('authorized_users').select('id').eq('tenant_id', TENANT_2);
  if (!t2Users || t2Users.length === 0) {
    console.log("Seeding authorized user for Tenant 2...");
    await supabase.from('authorized_users').insert([{
      email: 'gerencia@vigilanciapatagonia.ar',
      role: 'admin',
      status: 'approved',
      tenant_id: TENANT_2,
      notes: 'Gerente General Patagonia'
    }]);
  }

  const { data: t2Resources } = await supabase.from('resources').select('id').eq('tenant_id', TENANT_2);
  if (!t2Resources || t2Resources.length === 0) {
    console.log("Seeding guards/resources for Tenant 2...");
    await supabase.from('resources').insert([
      {
        name: 'Carlos Alberto Neuquén',
        role: 'vigilador',
        status: 'activo',
        dni: '28455123',
        phone: '+54 299 555-0101',
        email: 'carlos.neuquen@patagonia.ar',
        credential_number: 'PAT-901',
        shirt_size: 'L',
        pants_size: '44',
        boot_size: '42',
        hourly_pay_rate: 3800,
        tenant_id: TENANT_2
      },
      {
        name: 'Marcelo Rios Bariloche',
        role: 'supervisor',
        status: 'activo',
        dni: '25112443',
        phone: '+54 299 555-0102',
        email: 'marcelo.rios@patagonia.ar',
        credential_number: 'PAT-902',
        shirt_size: 'XL',
        pants_size: '46',
        boot_size: '43',
        hourly_pay_rate: 4500,
        tenant_id: TENANT_2
      }
    ]);
  }

  const { data: t2Inv } = await supabase.from('resource_inventory').select('id').eq('tenant_id', TENANT_2);
  if (!t2Inv || t2Inv.length === 0) {
    console.log("Seeding logistics/inventory for Tenant 2...");
    await supabase.from('resource_inventory').insert([
      {
        item_name: 'Handie Motorola VHF #1',
        category: 'comunicacion',
        serial_number: 'PAT-MOT-001',
        quantity: 1,
        status: 'operativo',
        notes: 'Handie asignado a garita central',
        tenant_id: TENANT_2
      },
      {
        item_name: 'Chaleco Reversible Refractario #1',
        category: 'indumentaria',
        serial_number: 'PAT-CHAL-001',
        quantity: 1,
        status: 'operativo',
        notes: 'Talle XL en buen estado',
        tenant_id: TENANT_2
      }
    ]);
  }

  // 4. Seed missing data for Tenant 3 (SecureForce México S.A. de C.V.)
  console.log("\n--- Checking and Seeding Tenant 3: SecureForce México S.A. de C.V. ---");
  const { data: t3Users } = await supabase.from('authorized_users').select('id').eq('tenant_id', TENANT_3);
  if (!t3Users || t3Users.length === 0) {
    console.log("Seeding authorized user for Tenant 3...");
    await supabase.from('authorized_users').insert([{
      email: 'cto@secureforce.mx',
      role: 'admin',
      status: 'approved',
      tenant_id: TENANT_3,
      notes: 'Administrador General México'
    }]);
  }

  const { data: t3Resources } = await supabase.from('resources').select('id').eq('tenant_id', TENANT_3);
  if (!t3Resources || t3Resources.length === 0) {
    console.log("Seeding guards/resources for Tenant 3...");
    await supabase.from('resources').insert([
      {
        name: 'Alejandro Mendoza CDMX',
        role: 'vigilador',
        status: 'activo',
        dni: 'MX-CURP-AM90123',
        phone: '+52 55 1234-5678',
        email: 'alejandro.mendoza@secureforce.mx',
        credential_number: 'SFMX-101',
        shirt_size: 'M',
        pants_size: '32',
        boot_size: '27',
        hourly_pay_rate: 150,
        tenant_id: TENANT_3
      },
      {
        name: 'Guillermo Fernández Guadalajara',
        role: 'supervisor',
        status: 'activo',
        dni: 'MX-CURP-GF88112',
        phone: '+52 55 9876-5432',
        email: 'guillermo.fernandez@secureforce.mx',
        credential_number: 'SFMX-102',
        shirt_size: 'L',
        pants_size: '34',
        boot_size: '28',
        hourly_pay_rate: 220,
        tenant_id: TENANT_3
      }
    ]);
  }

  const { data: t3Inv } = await supabase.from('resource_inventory').select('id').eq('tenant_id', TENANT_3);
  if (!t3Inv || t3Inv.length === 0) {
    console.log("Seeding logistics/inventory for Tenant 3...");
    await supabase.from('resource_inventory').insert([
      {
        item_name: 'Radio Hytera Digital #101',
        category: 'comunicacion',
        serial_number: 'HYT-MX-001',
        quantity: 1,
        status: 'operativo',
        notes: 'Frecuencia codificada CDMX',
        tenant_id: TENANT_3
      },
      {
        item_name: 'Detector Metal Portátil Garret #101',
        category: 'seguridad',
        serial_number: 'GAR-MX-001',
        quantity: 1,
        status: 'operativo',
        notes: 'Para control de accesos corporativo',
        tenant_id: TENANT_3
      }
    ]);
  }

  // 5. Seed missing inventory for Tenant 1 (Seguridad Norte S.A.)
  console.log("\n--- Checking and Seeding Tenant 1 Inventory ---");
  const { data: t1Inv } = await supabase.from('resource_inventory').select('id').eq('tenant_id', TENANT_1);
  if (!t1Inv || t1Inv.length === 0) {
    console.log("Seeding logistics/inventory for Tenant 1...");
    await supabase.from('resource_inventory').insert([
      {
        item_name: 'Radio Motorola EP450 #1',
        category: 'comunicacion',
        serial_number: 'SN-MOT-101',
        quantity: 1,
        status: 'operativo',
        notes: 'Asignado a Supermercado Norte',
        tenant_id: TENANT_1
      },
      {
        item_name: 'Linterna LED 1000 Lumens #1',
        category: 'linterna',
        serial_number: 'SN-LINT-101',
        quantity: 1,
        status: 'operativo',
        notes: 'Batería recargable USB',
        tenant_id: TENANT_1
      }
    ]);
  }

  console.log("\n=== DATABASE REMEDIATION COMPLETE ===");
}

runFixes().catch(console.error);
