import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const purchases = await db.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      include: { supplier: { select: { name: true } }, user: { select: { name: true } }, items: true },
    });
    return NextResponse.json({ success: true, data: purchases });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierId, items, userId } = body;

    let subtotal = 0;
    let totalGst = 0;
    const purchaseItemsData: any[] = [];

    for (const item of items) {
      const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) throw new Error(`Medicine not found: ${item.medicineId}`);

      let qtySmallest = item.quantity;
      if (item.unitType === 'strip') qtySmallest = item.quantity * medicine.unitsPerStrip;
      else if (item.unitType === 'box') qtySmallest = item.quantity * medicine.stripsPerBox * medicine.unitsPerStrip;

      const lineTotal = qtySmallest * item.purchaseRate;
      const cgst = lineTotal * (medicine.gstPercent / 2) / 100;
      const sgst = cgst;
      subtotal += lineTotal;
      totalGst += cgst + sgst;

      // Create or update batch
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const batchNo = item.batchNo || `BATCH-${Date.now()}`;

      const batch = await db.medicineBatch.upsert({
        where: { id: item.batchId || '' },
        create: {
          medicineId: medicine.id,
          batchNo,
          expiryDate,
          purchaseRate: item.purchaseRate,
          saleRate: medicine.saleRate,
          mrp: medicine.mrp,
          stockQty: qtySmallest,
          initialStock: qtySmallest,
          supplierId: supplierId,
          purchaseDate: new Date(),
          active: true,
        },
        update: { stockQty: { increment: qtySmallest } },
      });

      purchaseItemsData.push({
        purchaseId: '', // set after purchase creation
        medicineId: medicine.id,
        batchId: batch.id,
        medicineName: medicine.name,
        batchNo,
        quantity: item.quantity,
        unitType: item.unitType,
        purchaseRate: item.purchaseRate,
        gstPercent: medicine.gstPercent,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        total: Math.round(lineTotal * 100) / 100,
        expiryDate,
      });
    }

    const grandTotal = subtotal + totalGst;
    const lastPur = await db.purchase.findFirst({ orderBy: { createdAt: 'desc' }, select: { invoiceNo: true } });
    let nextNum = 201;
    if (lastPur?.invoiceNo) {
      const num = parseInt(lastPur.invoiceNo.replace(/\D/g, ''));
      if (!isNaN(num)) nextNum = num + 1;
    }

    const purchase = await db.purchase.create({
      data: {
        invoiceNo: `PUR-${String(nextNum).padStart(5, '0')}`,
        supplierId,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: 0,
        sgst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        paidAmount: 0,
        balanceDue: Math.round(grandTotal * 100) / 100,
        userId: userId || null,
        status: 'Completed',
        items: { create: purchaseItemsData },
      },
      include: { supplier: { select: { name: true } }, items: true },
    });

    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
