/**
 * Direct SQLite data export using better-sqlite3.
 * Reads from the SQLite file directly (bypasses Prisma).
 * 
 * Usage: node scripts/export-sqlite-direct.js
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');
const OUT_PATH = path.join(__dirname, 'exported-data.json');

if (!fs.existsSync(DB_PATH)) {
  console.error(`SQLite database not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

// Get all user tables (skip internal SQLite tables)
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name"
).all();

console.log(`Found ${tables.length} tables\n`);

const exportData = {};

for (const { name: table } of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM "${table}"`).all();
    exportData[table] = rows;
    console.log(`  ✅ ${table}: ${rows.length} records`);
  } catch (err) {
    console.log(`  ⚠️  ${table}: SKIPPED (${err.message.substring(0, 80)})`);
  }
}

db.close();

fs.writeFileSync(OUT_PATH, JSON.stringify(exportData, null, 2));
console.log(`\n✅ Export complete! Saved to: ${OUT_PATH}`);
console.log(`   Total tables: ${Object.keys(exportData).length}`);
const totalRows = Object.values(exportData).reduce((sum, rows) => sum + rows.length, 0);
console.log(`   Total records: ${totalRows}`);
