const fs = require('fs');
const path = require('path');
const https = require('https');

// Read config from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
  process.exit(1);
}

const urlObj = new URL(SUPABASE_URL);
const hostname = urlObj.hostname;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

async function runSqlDirect(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{ query: sql }]);
    const options = {
      hostname: hostname,
      port: 443,
      path: '/pg/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Error: migrations directory not found at ${MIGRATIONS_DIR}`);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n📦 Found ${files.length} migration files\n`);

  let ok = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    
    if (!sql) {
      console.log(`⏭️  SKIP ${file} (empty)`);
      continue;
    }

    process.stdout.write(`⏳ ${file} ... `);
    
    try {
      const result = await runSqlDirect(sql);
      if (result.status >= 200 && result.status < 300) {
        console.log(`✅ OK`);
        ok++;
      } else {
        const parsed = JSON.parse(result.data || '{}');
        const msg = parsed?.message || parsed?.error || result.data?.substring(0, 100);
        console.log(`⚠️  Status ${result.status}: ${msg}`);
        errors++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Done: ${ok} OK, ${errors} with warnings/errors`);
}

main();
