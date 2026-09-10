import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("====================================================");
console.log("🛡️ SIGPAD PLATFORM HEALTH & REGRESSION AUDIT SUITE 🛡️");
console.log("====================================================\n");

let passed = true;

function logResult(checkName: string, success: boolean, detail?: string) {
  if (success) {
    console.log(`✅ [PASS] ${checkName}`);
  } else {
    console.log(`❌ [FAIL] ${checkName}`);
    if (detail) console.log(`   └─ ${detail}`);
    passed = false;
  }
}

// 1. TypeScript Strict Type Check
try {
  console.log("1. Running TypeScript type safety check...");
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  logResult("TypeScript Compilation (0 errors)", true);
} catch (err: any) {
  logResult("TypeScript Compilation", false, err.stdout?.toString() || err.message);
}

// 2. Map Marker Bounding Box Integrity (40px x 40px fixed size)
const mapFiles = [
  'src/components/MapView.tsx',
  'src/components/operador/MobileLeaflet.tsx',
  'src/components/gerente/TacticalLeaflet.tsx'
];

let mapBoundingBoxOk = true;
for (const fileRel of mapFiles) {
  const fullPath = path.resolve(process.cwd(), fileRel);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('w-10 h-10') && !content.includes('40px')) {
      mapBoundingBoxOk = false;
      logResult(`Map Marker Bounding Box (${fileRel})`, false, "Missing 40px/w-10 h-10 container");
    }
  }
}
if (mapBoundingBoxOk) {
  logResult("Map Marker Bounding Box Stability (Fixed 40px anchor)", true);
}

// 3. Supabase Realtime Channel Cleanup Check
const realtimeFiles = [
  'src/app/operador/fichaje/page.tsx',
  'src/app/gerente/mapa/page.tsx',
  'src/app/gerente/page.tsx'
];

let realtimeCleanupOk = true;
for (const fileRel of realtimeFiles) {
  const fullPath = path.resolve(process.cwd(), fileRel);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('removeChannel')) {
      realtimeCleanupOk = false;
      logResult(`Realtime Channel Cleanup (${fileRel})`, false, "Missing supabase.removeChannel cleanup");
    }
  }
}
if (realtimeCleanupOk) {
  logResult("Supabase Realtime Channel Lifecycle Cleanup", true);
}

// 4. Resource Filter Integrity Check (Preventing restrictive in('status', ['activo']))
const apiFiles = [
  'src/app/api/dashboard/map/route.ts',
  'src/app/gerente/mapa/page.tsx'
];

let filterIntegrityOk = true;
for (const fileRel of apiFiles) {
  const fullPath = path.resolve(process.cwd(), fileRel);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(".neq('status', 'inactivo')") || content.includes(".in('status', ['activo', 'active', 'En Turno'])")) {
      filterIntegrityOk = false;
      logResult(`Resource Filter Integrity (${fileRel})`, false, "Found restrictive status query that hides active guards");
    }
  }
}
if (filterIntegrityOk) {
  logResult("Resource & Guard Status Filter Coexistence", true);
}

console.log("\n====================================================");
if (passed) {
  console.log("🎉 ALL PLATFORM PROTECTION CHECKS PASSED SUCCESSFULLY!");
} else {
  console.log("⚠️ PLATFORM AUDIT DETECTED REGRESSIONS OR ISSUES.");
  process.exit(1);
}
console.log("====================================================\n");
