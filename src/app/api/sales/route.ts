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
    const { customerId, customerName, paymentMode, items, userId, loyaltyPointsUsed } = body;

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

    // Loyalty points calculation
    const pointsToUse = Math.max(0, Math.floor(Number(loyaltyPointsUsed) || 0));
    const maxDiscountFromPoints = grandTotal * 0.1; // Max 10% of bill
    const pointsDiscount = Math.min(pointsToUse, maxDiscountFromPoints); // ₹1 per point
    const loyaltyPointsEarned = Math.floor(grandTotal / 100);

    // Apply loyalty points discount
    const finalGrandTotal = Math.round((grandTotal - pointsDiscount) * 100) / 100;

    // Credit limit check
    let creditWarning: string | null = null;
    let customerData: any = null;
    if (customerId) {
      customerData = await db.customer.findUnique({ where: { id: customerId } });
      if (customerData && customerData.creditLimit > 0) {
        const projectedBalance = customerData.balance + finalGrandTotal;
        if (projectedBalance > customerData.creditLimit) {
          const excess = Math.round((projectedBalance - customerData.creditLimit) * 100) / 100;
          creditWarning = `This sale will exceed customer's credit limit by ₹${excess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
    }

    // Get next invoice number using max query with retry
    let invoiceNo = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const allInvoices = await db.sale.findMany({
        select: { invoiceNo: true },
        orderBy: { invoiceNo: 'desc' },
        take: 1,
      });
      let nextNum = 1001;
      if (allInvoices.length > 0 && allInvoices[0].invoiceNo) {
        const num = parseInt(allInvoices[0].invoiceNo.replace(/\D/g, ''));
        if (!isNaN(num)) nextNum = num + 1;
      }
      invoiceNo = `INV-${String(nextNum).padStart(5, '0')}`;

      // Check if it already exists
      const exists = await db.sale.findFirst({ where: { invoiceNo } });
      if (!exists) break;
    }

    const sale = await db.sale.create({
      data: {
        invoiceNo,
        customerId: customerId || null,
        customerName: customerName || null,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: 0,
        sgst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(finalGrandTotal * 100) / 100,
        paidAmount: Math.round(finalGrandTotal * 100) / 100,
        balanceDue: 0,
        paymentMode: paymentMode || 'Cash',
        userId: userId || null,
        status: 'Completed',
        loyaltyPointsUsed: pointsToUse,
        loyaltyPointsEarned,
        items: { create: saleItemsData },
      },
      include: { customer: { select: { name: true } }, items: true },
    });

    // Update customer: loyalty points, balance, total purchases
    if (customerId && customerData) {
      await db.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: {
            increment: loyaltyPointsEarned - pointsToUse,
          },
          balance: {
            increment: finalGrandTotal,
          },
          totalPurchases: {
            increment: finalGrandTotal,
          },
        },
      });
    }

    const response: any = { success: true, data: sale };
    if (creditWarning) {
      response.warning = creditWarning;
    }
    if (loyaltyPointsEarned > 0) {
      response.loyaltyPointsEarned = loyaltyPointsEarned;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
