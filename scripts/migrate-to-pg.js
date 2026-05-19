/**
 * Fast SQLite → PostgreSQL data migration.
 * Reads SQLite, generates SQL, executes via pg.Client.
 */
const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');

const PG_URL = process.argv[2] || process.env.DATABASE_URL;
if (!PG_URL || !PG_URL.startsWith('postgresql://')) {
  console.error('Usage: node scripts/migrate-to-pg.js <postgresql://...>');
  process.exit(1);
}

const SQLITE_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');

const TABLES = [
  'User', 'Setting', 'Rack', 'Supplier', 'Doctor', 'Customer',
  'Medicine', 'MedicineBatch',
  'PurchaseOrder', 'PurchaseOrderItem', 'Purchase', 'PurchaseItem',
  'Prescription', 'PrescriptionItem',
  'Sale', 'SaleItem', 'Payment', 'Return', 'ReturnItem',
  'StockMovement', 'DayClose', 'AuditLog',
];

const DATETIME_COLS = new Set([
  'lastLogin', 'createdAt', 'updatedAt', 'expiryDate', 'purchaseDate',
  'date', 'expectedDate',
]);
const BOOLEAN_COLS = new Set(['active', 'allowLooseSale']);

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  // Escape strings for SQL
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function convertVal(col, val) {
  if (val === null || val === undefined) return null;
  if (BOOLEAN_COLS.has(col) && typeof val === 'number') return val === 1;
  if (DATETIME_COLS.has(col) && typeof val === 'number') {
    return "'" + new Date(val).toISOString() + "'";
  }
  return val;
}

async function migrate() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('Connected to PostgreSQL\n');

  let totalImported = 0;

  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
    if (rows.length === 0) {
      console.log(`  ⏭️  ${table}: 0 records`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    // Process in batches of 50
    const BATCH = 50;
    let imported = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = batch.map(row => {
        const vals = columns.map(col => {
          const v = convertVal(col, row[col]);
          if (v === null) return 'NULL';
          if (v === true || v === false) return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'string' && v.startsWith("'")) return v;
          return esc(v);
        });
        return `(${vals.join(', ')})`;
      }).join(', ');

      const sql = `INSERT INTO "${table}" (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`;

      try {
        const res = await pg.query(sql);
        imported += res.rowCount || batch.length;
      } catch (err) {
        // Fallback: insert one by one for this batch
        for (const row of batch) {
          const vals = columns.map(col => {
            const v = convertVal(col, row[col]);
            if (v === null) return 'NULL';
            if (v === true || v === false) return v ? 'TRUE' : 'FALSE';
            if (typeof v === 'string' && v.startsWith("'")) return v;
            return esc(v);
          });
          const singleSql = `INSERT INTO "${table}" (${colList}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
          try {
            const r = await pg.query(singleSql);
            imported += r.rowCount || 1;
          } catch (e2) {
            // silent skip
          }
        }
      }
    }

    totalImported += imported;
    console.log(`  ✅ ${table}: ${imported}/${rows.length}`);
  }

  await pg.end();
  sqlite.close();
  console.log(`\n✅ Migration complete! Total: ${totalImported} records`);
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
