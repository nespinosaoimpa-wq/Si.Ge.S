const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

function fixSqlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Regex to match: CREATE POLICY IF NOT EXISTS policy_name ON table_name FOR ... USING ... WITH CHECK ...
  // Note: policy name and table name might have double quotes or not.
  // Example: CREATE POLICY IF NOT EXISTS "open_alarms" ON alarms ...
  const regex = /CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s+ON\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s+/gi;

  let match;
  let matchesFound = [];

  // Reset regex state
  regex.lastIndex = 0;
  
  // We will replace each occurrence by finding the policy name and table name,
  // then prepending DROP POLICY IF EXISTS policy_name ON table_name; and changing CREATE POLICY IF NOT EXISTS to CREATE POLICY.
  
  // Since string replacement can be tricky inline, we can do it iteratively
  // by parsing and replacing CREATE POLICY IF NOT EXISTS with CREATE POLICY,
  // and inserting the DROP statement.
  
  // Let's do a replace using a replace function:
  content = content.replace(/CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))\s+ON\s+(?:"([^"]+)"|([a-zA-Z0-9_-]+))/gi, (fullMatch, pName1, pName2, tName1, tName2) => {
    const policyName = pName1 || pName2;
    const tableName = tName1 || tName2;
    console.log(`Found invalid policy syntax in ${path.basename(filePath)}: policy "${policyName}" on table "${tableName}"`);
    return `DROP POLICY IF EXISTS "${policyName}" ON "${tableName}";\nCREATE POLICY "${policyName}" ON "${tableName}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations dir not found: ${MIGRATIONS_DIR}`);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    if (fixSqlFile(filePath)) {
      fixedCount++;
    }
  }

  console.log(`Finished checking migration files. Fixed ${fixedCount} files.`);
}

main();
