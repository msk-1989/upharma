import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireActiveShift } from '@/lib/shift-guard';

export const dynamic = 'force-dynamic';

// GET /api/batches - Get batches (optionally filtered by medicineId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get('medicineId') || '';

    const where: Record<string, unknown> = { active: true };
    if (medicineId) where.medicineId = medicineId;

    const batches = await db.medicineBatch.findMany({
      where,
      include: {
        medicine: {
          select: {
            name: true,
            genericName: true,
            baseUnit: true,
            unitsPerStrip: true,
            stripsPerBox: true,
            reorderLevel: true,
          },
        },
        supplier: {
          select: { name: true, address: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: batches });
  } catch (error) {
    console.error('Batches list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/batches - Create batch (with stock IN movement)
export async function POST(request: NextRequest) {
  try {
    // Mandatory active-shift check before batch creation (adds stock)
    const shiftCheck = await requireActiveShift();
    if (!shiftCheck.allowed) {
      return NextResponse.json({ success: false, error: shiftCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const {
      medicineId,
      batchNo,
      expiryDate,
      purchaseRate,
      saleRate,
      mrp,
      stockQty,
      supplierId,
      userId,
    } = body;

    // Verify medicine exists
    const medicine = await db.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine) {
      return NextResponse.json({ success: false, error: 'Medicine not found' }, { status: 404 });
    }

    // Create batch
    const batch = await db.medicineBatch.create({
      data: {
        medicineId,
        batchNo,
        expiryDate: new Date(expiryDate),
        purchaseRate: purchaseRate ?? 0,
        saleRate: saleRate ?? 0,
        mrp: mrp ?? 0,
        stockQty: stockQty ?? 0,
        initialStock: stockQty ?? 0,
        supplierId: supplierId || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
        active: true,
      },
    });

    // Create stock movement
    if (stockQty > 0) {
      await db.stockMovement.create({
        data: {
          medicineId,
          batchId: batch.id,
          type: 'IN',
          quantity: stockQty,
          notes: `Initial stock for batch ${batchNo}`,
          userId: userId || null,
        },
      });
    }

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (error) {
    console.error('Batch create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create batch' }, { status: 500 });
  }
}
