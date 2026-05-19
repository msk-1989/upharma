/**
 * Import exported SQLite data into PostgreSQL via Prisma.
 * Handles SQLite → PostgreSQL type conversions:
 *   - Boolean: 0/1 → true/false
 *   - DateTime: Unix ms timestamp → ISO string
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/import-data-to-pg.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

// Fields that are DateTime type in Prisma schema (across all models)
const DATETIME_FIELDS = new Set([
  'lastLogin', 'createdAt', 'updatedAt',
  'expiryDate', 'purchaseDate', 'date', 'expectedDate',
]);

// Fields that are Boolean type in Prisma schema
const BOOLEAN_FIELDS = new Set([
  'active', 'allowLooseSale',
]);

const IMPORT_ORDER = [
  'User', 'Setting',
  'Rack', 'Supplier', 'Doctor', 'Customer',
  'Medicine',
  'MedicineBatch',
  'PurchaseOrder', 'PurchaseOrderItem',
  'Purchase', 'PurchaseItem',
  'Prescription', 'PrescriptionItem',
  'Sale', 'SaleItem', 'Payment',
  'Return', 'ReturnItem',
  'StockMovement',
  'DayClose', 'AuditLog',
] as const;

const TABLE_TO_MODEL: Record<string, string> = {
  User: 'user', Setting: 'setting', Rack: 'rack', Supplier: 'supplier',
  Doctor: 'doctor', Customer: 'customer', Medicine: 'medicine',
  MedicineBatch: 'medicineBatch', PurchaseOrder: 'purchaseOrder',
  PurchaseOrderItem: 'purchaseOrderItem', Purchase: 'purchase',
  PurchaseItem: 'purchaseItem', Prescription: 'prescription',
  PrescriptionItem: 'prescriptionItem', Sale: 'sale', SaleItem: 'saleItem',
  Payment: 'payment', Return: 'return', ReturnItem: 'returnItem',
  StockMovement: 'stockMovement', DayClose: 'dayClose', AuditLog: 'auditLog',
};

function convertRecord(record: Record<string, any>): Record<string, any> {
  const converted: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      converted[key] = null;
      continue;
    }
    // Convert SQLite boolean (0/1) to real boolean
    if (BOOLEAN_FIELDS.has(key) && typeof value === 'number') {
      converted[key] = value === 1;
      continue;
    }
    // Convert SQLite DateTime (Unix ms timestamp) to ISO string
    if (DATETIME_FIELDS.has(key) && typeof value === 'number') {
      converted[key] = new Date(value).toISOString();
      continue;
    }
    converted[key] = value;
  }
  return converted;
}

async function importAll() {
  const filePath = path.join(__dirname, 'exported-data.json');
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log('📦 Importing data into PostgreSQL...\n');

  let totalImported = 0;
  let totalErrors = 0;

  for (const tableName of IMPORT_ORDER) {
    const records: any[] = rawData[tableName] || [];
    if (records.length === 0) {
      console.log(`  ⏭️  ${tableName}: 0 records (skipped)`);
      continue;
    }

    const modelName = TABLE_TO_MODEL[tableName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (db as any)[modelName];

    let imported = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const converted = convertRecord(record);

        // Remove auto-managed timestamps
        delete converted.createdAt;
        delete converted.updatedAt;

        await model.create({ data: converted });
        imported++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Unique constraint — try updating
          try {
            const converted = convertRecord(record);
            delete converted.createdAt;
            delete converted.updatedAt;
            const id = converted.id;
            delete converted.id;
            await model.update({ where: { id }, data: converted });
            imported++;
          } catch {
            errors++;
          }
        } else {
          errors++;
          if (errors <= 1) {
            console.log(`      ${tableName} error: ${err.message.substring(0, 200)}`);
          }
        }
      }
    }

    totalImported += imported;
    totalErrors += errors;
    console.log(`  ${errors > 0 ? '⚠️' : '✅'} ${tableName}: ${imported}/${records.length}${errors > 0 ? ` (${errors} errors)` : ''}`);
  }

  console.log(`\n✅ Done! ${totalImported} imported, ${totalErrors} errors`);
}

importAll()
  .catch((e) => { console.error('Import failed:', e); process.exit(1); })
  .finally(() => db.$disconnect());
