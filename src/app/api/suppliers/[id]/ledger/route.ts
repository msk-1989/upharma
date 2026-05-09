import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/suppliers/[id]/ledger - Get supplier purchase ledger
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await db.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    // Get all purchases from this supplier
    const purchases = await db.purchase.findMany({
      where: { supplierId: id },
      orderBy: { date: 'desc' },
      include: {
        items: {
          select: {
            medicineName: true,
            quantity: true,
            unitType: true,
            purchaseRate: true,
            total: true,
          },
        },
      },
    });

    // Get returns for this supplier
    const returns = await db.return.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: { medicineName: true, quantity: true, total: true },
        },
      },
    });

    // Build ledger entries
    const ledger: Array<{
      id: string;
      date: Date;
      type: 'purchase' | 'return' | 'payment';
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      details: string;
    }> = [];

    let runningBalance = 0;

    // Add purchases as debit entries (we owe supplier)
    for (const purchase of purchases) {
      runningBalance += purchase.grandTotal;
      ledger.push({
        id: purchase.id,
        date: purchase.date,
        type: 'purchase',
        reference: purchase.invoiceNo,
        debit: purchase.grandTotal,
        credit: purchase.paidAmount,
        balance: runningBalance,
        details: `Purchase - ${purchase.items.map((i) => i.medicineName).join(', ') || 'Items'}`,
      });
    }

    // Add returns as credit entries
    for (const ret of returns) {
      runningBalance -= ret.totalAmount;
      ledger.push({
        id: ret.id,
        date: ret.createdAt,
        type: 'return',
        reference: ret.returnNo,
        debit: 0,
        credit: ret.totalAmount,
        balance: runningBalance,
        details: `Return - ${ret.reason || 'N/A'}`,
      });
    }

    // Sort by date descending
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          balance: supplier.balance,
        },
        totalPurchases: purchases.reduce((sum, p) => sum + p.grandTotal, 0),
        totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
        totalReturns: returns.reduce((sum, r) => sum + r.totalAmount, 0),
        purchasesCount: purchases.length,
        returnsCount: returns.length,
        ledger,
      },
    });
  } catch (error) {
    console.error('Supplier ledger error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
