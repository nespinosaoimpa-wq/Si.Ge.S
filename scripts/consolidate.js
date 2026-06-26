const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const OUTPUT_FILE = path.join(__dirname, '..', 'supabase', 'consolidated_schema.sql');

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Error: migrations directory not found at ${MIGRATIONS_DIR}`);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files. Consolidating...`);

  let consolidatedSql = `-- ==========================================================\n`;
  consolidatedSql += `-- Si.Ge.S — CONSOLIDATED SCHEMA MIGRATION\n`;
  consolidatedSql += `-- Generated: ${new Date().toISOString()}\n`;
  consolidatedSql += `-- Contains ${files.length} migrations executed in chronological order.\n`;
  consolidatedSql += `-- ==========================================================\n\n`;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content) {
      consolidatedSql += `-- ----------------------------------------------------------\n`;
      consolidatedSql += `-- Migration: ${file}\n`;
      consolidatedSql += `-- ----------------------------------------------------------\n\n`;
      consolidatedSql += content;
      consolidatedSql += `\n\n`;
    }
  }

  // Ensure storage and buckets statements are handled or have fallback schemas
  fs.writeFileSync(OUTPUT_FILE, consolidatedSql, 'utf8');
  console.log(`Success! Consolidated schema written to ${OUTPUT_FILE}`);
}

main();
