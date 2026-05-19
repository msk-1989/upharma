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
        stockQty: body.stockQty !== undefined ? body.stockQty : batch.stockQty,
        active: body.active !== undefined ? body.active : batch.active,
        supplierId: body.supplierId !== undefined ? body.supplierId : batch.supplierId,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : batch.purchaseDate,
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

// DELETE /api/batches/[id] - Delete batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const batch = await db.medicineBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    // Check if batch has sale items or purchase items referencing it
    const saleItemsCount = await db.saleItem.count({ where: { batchId: id } });
    const purchaseItemsCount = await db.purchaseItem.count({ where: { batchId: id } });
    const returnItemsCount = await db.returnItem.count({ where: { batchId: id } });

    if (saleItemsCount > 0 || purchaseItemsCount > 0 || returnItemsCount > 0) {
      // Soft delete: mark as inactive instead of hard deleting
      const deactivated = await db.medicineBatch.update({
        where: { id },
        data: { active: false, stockQty: 0 },
      });
      return NextResponse.json({
        success: true,
        data: deactivated,
        message: 'Batch deactivated (has linked transactions). Stock set to 0.',
      });
    }

    // Hard delete if no references
    await db.medicineBatch.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete batch' }, { status: 500 });
  }
}
