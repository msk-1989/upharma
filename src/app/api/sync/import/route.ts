import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync/import
 * Import data from another uPharma instance (local or cloud).
 * Upserts records by ID. Skips conflicts gracefully.
 *
 * Body: { data: { users, settings, medicines, ... } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });
    }

    let totalImported = 0;
    let totalSkipped = 0;
    const results: Record<string, { imported: number; skipped: number }> = {};

    // Import order: parents first (no foreign key dependencies)
    const importOrder = [
      { key: 'users', model: 'user' as const },
      { key: 'settings', model: 'setting' as const },
      { key: 'racks', model: 'rack' as const },
      { key: 'suppliers', model: 'supplier' as const },
      { key: 'doctors', model: 'doctor' as const },
      { key: 'customers', model: 'customer' as const },
      { key: 'medicines', model: 'medicine' as const },
      { key: 'batches', model: 'medicineBatch' as const },
      { key: 'sales', model: 'sale' as const },
      { key: 'saleItems', model: 'saleItem' as const },
      { key: 'purchases', model: 'purchase' as const },
      { key: 'purchaseItems', model: 'purchaseItem' as const },
      { key: 'returns', model: 'return' as const },
      { key: 'returnItems', model: 'returnItem' as const },
    ];

    for (const { key, model } of importOrder) {
      const records: any[] = data[key] || [];
      if (records.length === 0) continue;

      let imported = 0;
      let skipped = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaModel = (db as any)[model];

      for (const record of records) {
        try {
          const { createdAt, updatedAt, id, ...rest } = record;

          // Upsert: try update first, then create
          try {
            await prismaModel.update({
              where: { id },
              data: rest,
            });
            imported++;
          } catch {
            // Record doesn't exist, create it
            await prismaModel.create({
              data: { ...rest, id },
            });
            imported++;
          }
        } catch {
          skipped++;
        }
      }

      results[key] = { imported, skipped };
      totalImported += imported;
      totalSkipped += skipped;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalImported,
        totalSkipped,
        details: results,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
