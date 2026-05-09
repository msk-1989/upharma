import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/purchase-orders/[id] — Get PO with full items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true, address: true, gstNumber: true, drugLicense: true },
        },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, genericName: true, baseUnit: true, unitsPerStrip: true, stripsPerBox: true, purchaseRate: true, gstPercent: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        purchases: {
          select: { id: true, invoiceNo: true, date: true, grandTotal: true, status: true },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: purchaseOrder });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/purchase-orders/[id] — Update PO
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { supplierId, expectedDate, notes, status, items, userId } = body;

    const existing = await db.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    // Prevent updates if cancelled
    if (existing.status === 'Cancelled') {
      return NextResponse.json({ success: false, error: 'Cannot update a cancelled PO' }, { status: 400 });
    }

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        'Draft': ['Sent', 'Cancelled'],
        'Sent': ['Draft', 'Partial', 'Received', 'Cancelled'],
        'Partial': ['Received', 'Sent'],
        'Received': [],
        'Cancelled': [],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({ success: false, error: `Cannot transition from ${existing.status} to ${status}` }, { status: 400 });
      }
    }

    // If items are provided, recalculate totals
    let subtotal = existing.subtotal;
    let totalGst = existing.totalGst;
    let grandTotal = existing.grandTotal;

    if (items && Array.isArray(items) && items.length > 0) {
      subtotal = 0;
      totalGst = 0;

      for (const item of items) {
        if (!item.medicineId || !item.quantity || item.quantity <= 0) continue;

        const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) continue;

        const purchaseRate = item.purchaseRate || medicine.purchaseRate || 0;
        const gstPercent = medicine.gstPercent || 12;

        let qtySmallest = item.quantity;
        if (item.unitType === 'strip') qtySmallest = item.quantity * medicine.unitsPerStrip;
        else if (item.unitType === 'box') qtySmallest = item.quantity * medicine.stripsPerBox * medicine.unitsPerStrip;

        const lineBase = qtySmallest * purchaseRate;
        const lineGst = lineBase * gstPercent / 100;

        subtotal += lineBase;
        totalGst += lineGst;
      }

      grandTotal = subtotal + totalGst;

      // Delete existing items and recreate
      await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      for (const item of items) {
        if (!item.medicineId || !item.quantity || item.quantity <= 0) continue;

        const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) continue;

        const purchaseRate = item.purchaseRate || medicine.purchaseRate || 0;

        await db.purchaseOrderItem.create({
          data: {
            purchaseOrderId: id,
            medicineId: medicine.id,
            medicineName: medicine.name,
            quantity: item.quantity,
            unitType: item.unitType || 'strip',
            purchaseRate,
            gstPercent: medicine.gstPercent || 12,
            notes: item.notes || null,
            receivedQty: item.receivedQty || 0,
          },
        });
      }
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: supplierId || undefined,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status || undefined,
        subtotal: Math.round(subtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true, address: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, genericName: true, baseUnit: true, unitsPerStrip: true, stripsPerBox: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/purchase-orders/[id] — Cancel PO (only if Draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    if (existing.status !== 'Draft') {
      return NextResponse.json({ success: false, error: 'Only Draft POs can be cancelled' }, { status: 400 });
    }

    const cancelled = await db.purchaseOrder.update({
      where: { id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({ success: true, data: cancelled, message: 'Purchase Order cancelled successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
