import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/purchase-orders/[id]/convert — Convert PO to GRN (Purchase)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items, userId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item must be provided for conversion' }, { status: 400 });
    }

    // Fetch PO with items
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, address: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, unitsPerStrip: true, stripsPerBox: true, saleRate: true, mrp: true, gstPercent: true } },
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ success: false, error: 'Purchase Order not found' }, { status: 404 });
    }

    if (po.status === 'Cancelled') {
      return NextResponse.json({ success: false, error: 'Cannot convert a cancelled PO' }, { status: 400 });
    }

    if (po.status === 'Received') {
      return NextResponse.json({ success: false, error: 'This PO has already been fully received' }, { status: 400 });
    }

    // Calculate totals for the GRN
    let subtotal = 0;
    let totalGst = 0;
    const purchaseItemsData: any[] = [];

    // Validate items and calculate
    for (const convertItem of items) {
      if (!convertItem.poItemId || !convertItem.receivedQty || convertItem.receivedQty <= 0) {
        return NextResponse.json({ success: false, error: 'Each item must have a poItemId and positive receivedQty' }, { status: 400 });
      }
      if (!convertItem.batchNo) {
        return NextResponse.json({ success: false, error: 'Batch number is required for each item' }, { status: 400 });
      }

      const poItem = po.items.find((i: any) => i.id === convertItem.poItemId);
      if (!poItem) {
        return NextResponse.json({ success: false, error: `PO item not found: ${convertItem.poItemId}` }, { status: 404 });
      }

      // Check if received qty exceeds remaining qty
      const remainingQty = poItem.quantity - poItem.receivedQty;
      if (convertItem.receivedQty > remainingQty) {
        return NextResponse.json({ success: false, error: `Received qty ${convertItem.receivedQty} exceeds remaining ${remainingQty} for ${poItem.medicineName}` }, { status: 400 });
      }

      const medicine = poItem.medicine;
      const purchaseRate = convertItem.purchaseRate || poItem.purchaseRate || medicine.purchaseRate || 0;
      const gstPercent = medicine.gstPercent || 12;

      // Calculate quantity in smallest units
      let qtySmallest = convertItem.receivedQty;
      if (poItem.unitType === 'strip') qtySmallest = convertItem.receivedQty * medicine.unitsPerStrip;
      else if (poItem.unitType === 'box') qtySmallest = convertItem.receivedQty * medicine.stripsPerBox * medicine.unitsPerStrip;

      const lineBase = qtySmallest * purchaseRate;
      const cgst = lineBase * (gstPercent / 2) / 100;
      const sgst = cgst;

      subtotal += lineBase;
      totalGst += cgst + sgst;

      const expiryDate = convertItem.expiryDate ? new Date(convertItem.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      // Create or update batch
      const existingBatch = await db.medicineBatch.findFirst({
        where: {
          medicineId: medicine.id,
          batchNo: convertItem.batchNo,
        },
      });

      let batchId: string;
      if (existingBatch) {
        const updatedBatch = await db.medicineBatch.update({
          where: { id: existingBatch.id },
          data: {
            stockQty: { increment: qtySmallest },
            purchaseRate,
            saleRate: medicine.saleRate || existingBatch.saleRate,
            mrp: medicine.mrp || existingBatch.mrp,
            supplierId: po.supplierId,
            purchaseDate: new Date(),
          },
        });
        batchId = updatedBatch.id;
      } else {
        const newBatch = await db.medicineBatch.create({
          data: {
            medicineId: medicine.id,
            batchNo: convertItem.batchNo,
            expiryDate,
            purchaseRate,
            saleRate: medicine.saleRate || 0,
            mrp: medicine.mrp || 0,
            stockQty: qtySmallest,
            initialStock: qtySmallest,
            supplierId: po.supplierId,
            purchaseDate: new Date(),
            active: true,
          },
        });
        batchId = newBatch.id;
      }

      // Create stock movement
      await db.stockMovement.create({
        data: {
          medicineId: medicine.id,
          batchId,
          type: 'IN',
          quantity: qtySmallest,
          reference: `PO:${po.poNumber}`,
          notes: `GRN from PO ${po.poNumber}`,
          userId: userId || null,
        },
      });

      purchaseItemsData.push({
        purchaseId: '', // set after purchase creation
        medicineId: medicine.id,
        batchId,
        medicineName: medicine.name,
        batchNo: convertItem.batchNo,
        quantity: convertItem.receivedQty,
        unitType: poItem.unitType,
        purchaseRate,
        gstPercent,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        total: Math.round(lineBase * 100) / 100,
        expiryDate,
      });

      // Update PO item receivedQty
      await db.purchaseOrderItem.update({
        where: { id: convertItem.poItemId },
        data: { receivedQty: { increment: convertItem.receivedQty } },
      });
    }

    const grandTotal = subtotal + totalGst;

    // Generate invoice number for the Purchase (GRN)
    const lastPur = await db.purchase.findFirst({ orderBy: { createdAt: 'desc' }, select: { invoiceNo: true } });
    let nextNum = 201;
    if (lastPur?.invoiceNo) {
      const num = parseInt(lastPur.invoiceNo.replace(/\D/g, ''));
      if (!isNaN(num)) nextNum = num + 1;
    }

    // Create the Purchase (GRN)
    const purchase = await db.purchase.create({
      data: {
        invoiceNo: `PUR-${String(nextNum).padStart(5, '0')}`,
        supplierId: po.supplierId,
        poId: po.id,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: 0,
        sgst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        paidAmount: 0,
        balanceDue: Math.round(grandTotal * 100) / 100,
        status: 'Completed',
        userId: userId || null,
        items: { create: purchaseItemsData },
      },
      include: {
        supplier: { select: { name: true, address: true } },
        items: true,
      },
    });

    // Update supplier balance
    await db.supplier.update({
      where: { id: po.supplierId },
      data: { balance: { increment: grandTotal } },
    });

    // Determine new PO status
    // Fetch updated items to check if all are fully received
    const updatedItems = await db.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id },
    });
    const allReceived = updatedItems.every((item: any) => item.receivedQty >= item.quantity);
    const someReceived = updatedItems.some((item: any) => item.receivedQty > 0);

    let newStatus: string;
    if (allReceived) {
      newStatus = 'Received';
    } else if (someReceived) {
      newStatus = 'Partial';
    } else {
      newStatus = po.status;
    }

    await db.purchaseOrder.update({
      where: { id: po.id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      data: purchase,
      message: `GRN ${purchase.invoiceNo} created successfully. PO status updated to ${newStatus}.`,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
