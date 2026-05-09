import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/day-close — Returns today's day close record with live calculations
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find or create today's DayClose record
    let dayClose = await db.dayClose.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
      },
      include: {
        openedByUser: { select: { id: true, name: true, username: true } },
        closedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    // If no record exists, do NOT auto-create — the frontend will show "Open Day" button
    // But we still need to calculate live totals
    const sales = await db.sale.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: 'Completed',
      },
    });

    const returns = await db.return.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        type: 'SALE_RETURN',
      },
    });

    const purchases = await db.purchase.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: 'Completed',
      },
    });

    // Calculate totals
    const totalSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCashSales = sales.filter(s => s.paymentMode === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCardSales = sales.filter(s => s.paymentMode === 'Card').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalUpiSales = sales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCreditSales = sales.filter(s => s.paymentMode === 'Credit').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalCashReturns = returns.filter(r => {
      // For sale returns, look up the original sale payment mode
      return r.totalAmount > 0;
    }).reduce((sum, r) => sum + r.totalAmount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
    const totalInvoices = sales.length;
    const totalReturnNotes = returns.length;

    // Build live summary (always fresh data)
    const liveSummary = {
      totalSales: Math.round(totalSales * 100) / 100,
      totalCashSales: Math.round(totalCashSales * 100) / 100,
      totalCardSales: Math.round(totalCardSales * 100) / 100,
      totalUpiSales: Math.round(totalUpiSales * 100) / 100,
      totalCreditSales: Math.round(totalCreditSales * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      totalCashReturns: Math.round(totalCashReturns * 100) / 100,
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      totalInvoices,
      totalReturnNotes,
    };

    return NextResponse.json({
      success: true,
      data: {
        dayClose: dayClose || null,
        liveSummary,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/day-close — Open or close a day
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, openCash, closeCash, notes, userId } = body;

    if (!action || !['open', 'close'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Action must be "open" or "close"' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if a DayClose record exists for today
    const existing = await db.dayClose.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    });

    if (action === 'open') {
      if (existing) {
        return NextResponse.json({ success: false, error: 'Today is already opened. Cannot open again.' }, { status: 400 });
      }

      if (openCash === undefined || openCash === null) {
        return NextResponse.json({ success: false, error: 'Opening cash amount is required' }, { status: 400 });
      }

      const dayClose = await db.dayClose.create({
        data: {
          date: new Date(),
          openedBy: userId,
          openCash: Math.round(Number(openCash) * 100) / 100,
          status: 'Open',
        },
        include: {
          openedByUser: { select: { id: true, name: true, username: true } },
          closedByUser: { select: { id: true, name: true, username: true } },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId,
          action: 'DAY_OPEN',
          module: 'day-close',
          details: `Day opened with ₹${Number(openCash).toLocaleString('en-IN')} cash`,
        },
      });

      return NextResponse.json({ success: true, data: dayClose }, { status: 201 });
    }

    if (action === 'close') {
      if (!existing) {
        return NextResponse.json({ success: false, error: 'No open day found for today' }, { status: 400 });
      }

      if (existing.status === 'Closed') {
        return NextResponse.json({ success: false, error: 'Today is already closed' }, { status: 400 });
      }

      if (closeCash === undefined || closeCash === null) {
        return NextResponse.json({ success: false, error: 'Closing cash amount is required' }, { status: 400 });
      }

      // Calculate all totals for today
      const sales = await db.sale.findMany({
        where: { date: { gte: today, lt: tomorrow }, status: 'Completed' },
      });
      const returns = await db.return.findMany({
        where: { createdAt: { gte: today, lt: tomorrow }, type: 'SALE_RETURN' },
      });
      const purchases = await db.purchase.findMany({
        where: { date: { gte: today, lt: tomorrow }, status: 'Completed' },
      });

      const totalSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
      const totalCashSales = sales.filter(s => s.paymentMode === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0);
      const totalCardSales = sales.filter(s => s.paymentMode === 'Card').reduce((sum, s) => sum + s.grandTotal, 0);
      const totalUpiSales = sales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.grandTotal, 0);
      const totalCreditSales = sales.filter(s => s.paymentMode === 'Credit').reduce((sum, s) => sum + s.grandTotal, 0);
      const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);
      const totalPurchases = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
      const totalInvoices = sales.length;
      const totalReturnNotes = returns.length;

      const actualCloseCash = Math.round(Number(closeCash) * 100) / 100;
      const expectedCash = Math.round((existing.openCash + totalCashSales - totalReturns) * 100) / 100;
      const difference = Math.round((actualCloseCash - expectedCash) * 100) / 100;

      const dayClose = await db.dayClose.update({
        where: { id: existing.id },
        data: {
          closedBy: userId,
          closeCash: actualCloseCash,
          totalSales: Math.round(totalSales * 100) / 100,
          totalCashSales: Math.round(totalCashSales * 100) / 100,
          totalCardSales: Math.round(totalCardSales * 100) / 100,
          totalUpiSales: Math.round(totalUpiSales * 100) / 100,
          totalCreditSales: Math.round(totalCreditSales * 100) / 100,
          totalReturns: Math.round(totalReturns * 100) / 100,
          totalPurchases: Math.round(totalPurchases * 100) / 100,
          expectedCash,
          difference,
          totalInvoices,
          totalReturnNotes,
          status: 'Closed',
          notes: notes || null,
        },
        include: {
          openedByUser: { select: { id: true, name: true, username: true } },
          closedByUser: { select: { id: true, name: true, username: true } },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId,
          action: 'DAY_CLOSE',
          module: 'day-close',
          details: `Day closed. Sales: ₹${totalSales.toLocaleString('en-IN')}, Difference: ₹${difference.toLocaleString('en-IN')}`,
        },
      });

      return NextResponse.json({ success: true, data: dayClose });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
