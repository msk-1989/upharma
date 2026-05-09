import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/batches/[id] - Update batch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const batch = await db.medicineBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    const updated = await db.medicineBatch.update({
      where: { id },
      data: {
        batchNo: body.batchNo ?? batch.batchNo,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : batch.expiryDate,
        purchaseRate: body.purchaseRate !== undefined ? body.purchaseRate : batch.purchaseRate,
        saleRate: body.saleRate !== undefined ? body.saleRate : batch.saleRate,
        mrp: body.mrp !== undefined ? body.mrp : batch.mrp,
        active: body.active !== undefined ? body.active : batch.active,
        supplierId: body.supplierId !== undefined ? body.supplierId : batch.supplierId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update batch' }, { status: 500 });
  }
}

// GET /api/batches/[id] - Get single batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const batch = await db.medicineBatch.findUnique({
      where: { id },
      include: {
        medicine: true,
        supplier: {
          select: { name: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: batch });
  } catch (error) {
    console.error('Batch get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
