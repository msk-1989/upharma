import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        user: { select: { name: true } },
        items: true,
      },
    });
    return NextResponse.json({ success: true, data: sales });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentMode, items, userId } = body;

    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;
    const saleItemsData: any[] = [];

    for (const item of items) {
      const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) throw new Error(`Medicine not found: ${item.medicineId}`);

      // Convert to smallest units
      let qtySmallest = item.quantity;
      if (item.unitType === 'strip') qtySmallest = item.quantity * medicine.unitsPerStrip;
      else if (item.unitType === 'box') qtySmallest = item.quantity * medicine.stripsPerBox * medicine.unitsPerStrip;

      // Find batch FIFO
      const batch = await db.medicineBatch.findFirst({
        where: { medicineId: item.medicineId, active: true, stockQty: { gte: qtySmallest } },
        orderBy: { expiryDate: 'asc' },
      });

      const rate = batch?.saleRate || medicine.saleRate;
      const lineTotal = qtySmallest * rate;
      const cgst = lineTotal * (medicine.gstPercent / 2) / 100;
      const sgst = cgst;

      subtotal += lineTotal;
      totalGst += cgst + sgst;

      saleItemsData.push({
        medicineId: item.medicineId,
        batchId: batch?.id,
        medicineName: medicine.name,
        batchNo: batch?.batchNo,
        quantity: item.quantity,
        unitType: item.unitType,
        saleRate: rate,
        mrp: batch?.mrp || medicine.mrp,
        gstPercent: medicine.gstPercent,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        total: Math.round(lineTotal * 100) / 100,
        expiryDate: batch?.expiryDate,
      });

      // Deduct stock
      if (batch) {
        await db.medicineBatch.update({
          where: { id: batch.id },
          data: { stockQty: { decrement: qtySmallest } },
        });
      }
    }

    grandTotal = subtotal + totalGst;

    // Get next invoice number
    const lastSale = await db.sale.findFirst({ orderBy: { createdAt: 'desc' }, select: { invoiceNo: true } });
    let nextNum = 1051;
    if (lastSale?.invoiceNo) {
      const num = parseInt(lastSale.invoiceNo.replace(/\D/g, ''));
      if (!isNaN(num)) nextNum = num + 1;
    }

    const sale = await db.sale.create({
      data: {
        invoiceNo: `INV-${String(nextNum).padStart(5, '0')}`,
        customerId: customerId || null,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: 0,
        sgst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        paidAmount: Math.round(grandTotal * 100) / 100,
        balanceDue: 0,
        paymentMode: paymentMode || 'Cash',
        userId: userId || null,
        status: 'Completed',
        items: { create: saleItemsData },
      },
      include: { customer: { select: { name: true } }, items: true },
    });

    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
