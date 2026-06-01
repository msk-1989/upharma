import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { medicines } = body;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json({ success: false, error: 'No medicines data provided' }, { status: 400 });
    }

    if (medicines.length > 2000) {
      return NextResponse.json({ success: false, error: 'Maximum 2000 medicines per upload' }, { status: 400 });
    }

    const results = { created: 0, updated: 0, errors: 0, details: [] as string[] };
    const BATCH_SIZE = 100; // Process in batches to avoid timeouts

    for (let i = 0; i < medicines.length; i += BATCH_SIZE) {
      const batch = medicines.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          const name = (row.name || '').toString().trim();
          if (!name) {
            results.errors++;
            results.details.push(`Row ${i + 1}: Missing medicine name`);
            continue;
          }

          // Check if medicine already exists (by name match)
          const existing = await db.medicine.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, active: true },
          });

          const medicineData = {
            name,
            genericName: row.genericName ? row.genericName.toString().trim() : null,
            manufacturer: row.manufacturer ? row.manufacturer.toString().trim() : null,
            category: row.category ? row.category.toString().trim() : 'General',
            drugSchedule: row.drugSchedule ? row.drugSchedule.toString().trim() : 'OTC',
            hsnCode: row.hsnCode ? row.hsnCode.toString().trim() : null,
            gstPercent: parseFloat(row.gstPercent) || 12,
            barcode: row.barcode ? row.barcode.toString().trim() : null,
            baseUnit: row.baseUnit ? row.baseUnit.toString().trim() : 'Tablet',
            unitsPerStrip: parseInt(row.unitsPerStrip) || 10,
            stripsPerBox: parseInt(row.stripsPerBox) || 10,
            allowLooseSale: row.allowLooseSale !== undefined
              ? (row.allowLooseSale === true || row.allowLooseSale === 'Yes' || row.allowLooseSale === '1' || row.allowLooseSale === 'yes')
              : true,
            purchaseRate: parseFloat(row.purchaseRate) || 0,
            saleRate: parseFloat(row.saleRate) || 0,
            mrp: parseFloat(row.mrp) || 0,
            reorderLevel: parseInt(row.reorderLevel) || 20,
          };

          // Also create batch if batch data provided
          const hasBatch = row.batchNo || row.expiryDate || row.stockQty;

          if (existing) {
            // Update existing medicine (keep id, update fields)
            await db.medicine.update({
              where: { id: existing.id },
              data: medicineData,
            });

            // If batch data provided, add to existing medicine
            if (hasBatch) {
              const batchNo = (row.batchNo || '').toString().trim();
              const expiryDate = row.expiryDate
                ? new Date(row.expiryDate.toString())
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
              const stockQty = parseInt(row.stockQty) || 0;

              if (batchNo && stockQty > 0) {
                // Check if same batch exists for this medicine
                const existingBatch = await db.medicineBatch.findFirst({
                  where: { medicineId: existing.id, batchNo },
                });

                if (existingBatch) {
                  await db.medicineBatch.update({
                    where: { id: existingBatch.id },
                    data: {
                      stockQty: { increment: stockQty },
                      purchaseRate: parseFloat(row.purchaseRate) || existingBatch.purchaseRate,
                      saleRate: parseFloat(row.saleRate) || existingBatch.saleRate,
                      mrp: parseFloat(row.mrp) || existingBatch.mrp,
                      active: true,
                    },
                  });
                } else {
                  await db.medicineBatch.create({
                    data: {
                      medicineId: existing.id,
                      batchNo,
                      expiryDate,
                      purchaseRate: parseFloat(row.purchaseRate) || 0,
                      saleRate: parseFloat(row.saleRate) || 0,
                      mrp: parseFloat(row.mrp) || 0,
                      stockQty,
                      initialStock: stockQty,
                      active: true,
                    },
                  });
                }

                // Stock movement for the batch addition
                await db.stockMovement.create({
                  data: {
                    medicineId: existing.id,
                    type: 'IN',
                    quantity: stockQty,
                    reference: 'bulk-upload',
                    notes: `Bulk Upload — Batch ${batchNo}`,
                  },
                });
              }
            }

            results.updated++;
          } else {
            // Create new medicine
            const med = await db.medicine.create({ data: medicineData });

            // Create initial batch if data provided
            if (hasBatch) {
              const batchNo = (row.batchNo || '').toString().trim();
              const expiryDate = row.expiryDate
                ? new Date(row.expiryDate.toString())
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
              const stockQty = parseInt(row.stockQty) || 0;

              if (batchNo && stockQty > 0) {
                await db.medicineBatch.create({
                  data: {
                    medicineId: med.id,
                    batchNo,
                    expiryDate,
                    purchaseRate: parseFloat(row.purchaseRate) || 0,
                    saleRate: parseFloat(row.saleRate) || 0,
                    mrp: parseFloat(row.mrp) || 0,
                    stockQty,
                    initialStock: stockQty,
                    active: true,
                  },
                });

                await db.stockMovement.create({
                  data: {
                    medicineId: med.id,
                    type: 'IN',
                    quantity: stockQty,
                    reference: 'bulk-upload',
                    notes: `Bulk Upload — Batch ${batchNo}`,
                  },
                });
              }
            }

            results.created++;
          }
        } catch (err: unknown) {
          results.errors++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.details.push(`Row ${i + 1} (${row.name || 'unknown'}): ${msg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
