import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireActiveShift } from '@/lib/shift-guard';
import { requireDayOpen } from '@/lib/day-guard';

export const dynamic = 'force-dynamic';

// GET /api/returns - List all returns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || ''; // SALE_RETURN, PURCHASE_RETURN

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const returns = await db.return.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        supplier: {
          select: { id: true, name: true, phone: true, address: true },
        },
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            medicine: {
              select: { name: true, baseUnit: true, unitsPerStrip: true, stripsPerBox: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    console.error('Returns list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/returns - Create return
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type, // SALE_RETURN or PURCHASE_RETURN
      referenceId,
      customerId,
      supplierId,
      items,
      reason,
      userId,
    } = body;

    // Mandatory Active-Shift Check
    const shiftCheck = await requireActiveShift();
    if (!shiftCheck.allowed) {
      return NextResponse.json({ success: false, error: shiftCheck.error }, { status: 403 });
    }

    // Day-open check (non-admin)
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user && user.role !== 'Admin' && user.role !== 'Super Admin') {
        const dayCheck = await requireDayOpen();
        if (!dayCheck.allowed) {
          return NextResponse.json({ success: false, error: dayCheck.error }, { status: 403 });
        }
      }
    }

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Return type and items are required' },
        { status: 400 }
      );
    }

    if (type === 'SALE_RETURN' && !referenceId) {
      return NextResponse.json({ success: false, error: 'Sale reference is required for sale returns' }, { status: 400 });
    }

    if (type === 'PURCHASE_RETURN' && !referenceId) {
      return NextResponse.json({ success: false, error: 'Purchase reference is required for purchase returns' }, { status: 400 });
    }

    // Generate return number
    const returnCount = await db.return.count();
    const returnNo = `RET-${String(returnCount + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const returnItemsData: Array<{
      medicineId: string;
      batchId: string;
      quantity: number;
      unitType: string;
      rate: number;
      total: number;
      reason: string;
    }> = [];

    for (const item of items) {
      const medicine = await db.medicine.findUnique({
        where: { id: item.medicineId },
      });

      if (!medicine) {
        return NextResponse.json(
          { success: false, error: `Medicine not found: ${item.medicineId}` },
          { status: 404 }
        );
      }

      // Calculate smallest units based on unit type
      let smallestUnits = item.quantity;
      if (item.unitType === 'strip') {
        smallestUnits = item.quantity * medicine.unitsPerStrip;
      } else if (item.unitType === 'box') {
        smallestUnits = item.quantity * medicine.unitsPerStrip * medicine.stripsPerBox;
      }

      const rate = item.rate || medicine.saleRate;
      const itemTotal = smallestUnits * rate;
      totalAmount += itemTotal;

      returnItemsData.push({
        medicineId: item.medicineId,
        batchId: item.batchId || null,
        quantity: smallestUnits,
        unitType: item.unitType || 'tablet',
        rate,
        total: Math.round(itemTotal * 100) / 100,
        reason: item.reason || null,
      });

      // Handle stock adjustment
      if (item.batchId) {
        if (type === 'SALE_RETURN') {
          // Add stock back
          await db.medicineBatch.update({
            where: { id: item.batchId },
            data: { stockQty: { increment: smallestUnits } },
          });
          await db.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              batchId: item.batchId,
              type: 'IN',
              quantity: smallestUnits,
              reference: returnNo,
              notes: `Sale return ${returnNo}`,
              userId: userId || null,
            },
          });
        } else if (type === 'PURCHASE_RETURN') {
          // Deduct stock
          await db.medicineBatch.update({
            where: { id: item.batchId },
            data: { stockQty: { decrement: smallestUnits } },
          });
          await db.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              batchId: item.batchId,
              type: 'OUT',
              quantity: smallestUnits,
              reference: returnNo,
              notes: `Purchase return ${returnNo}`,
              userId: userId || null,
            },
          });
        }
      }
    }

    // Create return record
    const returnRecord = await db.return.create({
      data: {
        returnNo,
        type,
        referenceId,
        customerId: customerId || null,
        supplierId: supplierId || null,
        totalAmount: Math.round(totalAmount * 100) / 100,
        reason: reason || null,
        userId: userId || null,
        status: 'Completed',
        items: {
          create: returnItemsData,
        },
      },
      include: {
        customer: true,
        supplier: true,
        items: true,
      },
    });

    // Update customer balance for sale returns
    if (type === 'SALE_RETURN' && customerId) {
      await db.customer.update({
        where: { id: customerId },
        data: {
          balance: { decrement: totalAmount },
          totalPurchases: { decrement: totalAmount },
        },
      });
    }

    // Update supplier balance for purchase returns
    if (type === 'PURCHASE_RETURN' && supplierId) {
      await db.supplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: totalAmount } },
      });
    }

    return NextResponse.json({ success: true, data: returnRecord }, { status: 201 });
  } catch (error) {
    console.error('Return create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create return' }, { status: 500 });
  }
}
