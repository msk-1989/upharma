/**
 * Export data from SQLite database for PostgreSQL migration.
 *
 * Usage:
 *   1. Make sure your SQLite .env still has DATABASE_URL=file:prisma/dev.db
 *   2. Run: npx tsx scripts/export-sqlite-data.ts
 *   3. This creates scripts/exported-data.json
 *
 * Then after setting up PostgreSQL and running prisma migrate:
 *   4. Update .env to point to PostgreSQL
 *   5. Run: npx tsx scripts/import-data-to-pg.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Use SQLite — make sure DATABASE_URL points to SQLite file
const db = new PrismaClient();

const MODELS = [
  'User', 'Setting', 'Medicine', 'MedicineBatch', 'Rack',
  'StockMovement', 'Supplier', 'Purchase', 'PurchaseItem',
  'PurchaseOrder', 'PurchaseOrderItem', 'Doctor', 'Customer',
  'Prescription', 'PrescriptionItem', 'Sale', 'SaleItem',
  'Payment', 'Return', 'ReturnItem', 'DayClose', 'AuditLog',
] as const;

type ModelName = (typeof MODELS)[number];

async function exportAll() {
  console.log('📦 Exporting data from SQLite...\n');
  const exportData: Record<string, any[]> = {};

  for (const model of MODELS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = await (db as any)[model].findMany();
      exportData[model] = records;
      console.log(`  ✅ ${model}: ${records.length} records`);
    } catch (err) {
      console.log(`  ⚠️  ${model}: SKIPPED (${(err as Error).message})`);
    }
  }

  const outPath = path.join(__dirname, 'exported-data.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Export complete! Data saved to: ${outPath}`);
  console.log(`   Total models exported: ${Object.keys(exportData).length}`);
}

exportAll()
  .catch((e) => { console.error('Export failed:', e); process.exit(1); })
  .finally(() => db.$disconnect());
