import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/counter-shifts/close — Close a counter shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shiftId, closingCash, closingNote, userId } = body;

    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'Shift ID is required' }, { status: 400 });
    }
    if (closingCash === undefined || closingCash === null) {
      return NextResponse.json({ success: false, error: 'Closing cash amount is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Fetch the shift with counter and opener info
    const shift = await db.counterShift.findUnique({
      where: { id: shiftId },
      include: {
        counter: { select: { id: true, name: true } },
        openedByUser: { select: { id: true, name: true, role: true } },
        closedByUser: { select: { id: true, name: true } },
      },
    });

    if (!shift) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }

    if (shift.shiftStatus === 'Closed') {
      return NextResponse.json({ success: false, error: 'This shift is already closed' }, { status: 400 });
    }

    // Verify closer's permission: must be Admin/Manager or the shift opener
    const closerUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!closerUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdminOrManager = closerUser.role === 'Admin' || closerUser.role === 'Manager';
    const isOpener = shift.openedBy === userId;

    if (!isAdminOrManager && !isOpener) {
      return NextResponse.json(
        { success: false, error: 'Only an Admin, Manager, or the shift opener can close this shift' },
        { status: 403 }
      );
    }

    // Recalculate all totals from DB
    const sales = await db.sale.findMany({
      where: {
        counterShiftId: shift.id,
        status: 'Completed',
      },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCashSales = sales.filter(s => s.paymentMode === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCardSales = sales.filter(s => s.paymentMode === 'Card').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalUpiSales = sales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCreditSales = sales.filter(s => s.paymentMode === 'Credit').reduce((sum, s) => sum + s.grandTotal, 0);
    const totalInvoices = sales.length;

    // Returns within this shift's time range
    const returns = await db.return.findMany({
      where: {
        createdAt: { gte: shift.createdAt },
        type: 'SALE_RETURN',
      },
    });
    const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);

    // Look up original sale payment modes for cash returns only
    const retRefIds = returns.map(r => r.referenceId);
    const retOrigSales = retRefIds.length > 0
      ? await db.sale.findMany({ where: { id: { in: retRefIds } }, select: { id: true, paymentMode: true } })
      : [];
    const cashRetSaleIds = new Set(retOrigSales.filter(s => s.paymentMode === 'Cash').map(s => s.id));
    const totalCashReturns = returns.filter(r => cashRetSaleIds.has(r.referenceId)).reduce((sum, r) => sum + r.totalAmount, 0);

    // Cash withdrawals for this shift
    const withdrawals = await db.cashWithdrawal.findMany({
      where: { counterShiftId: shift.id },
    });
    const totalExpenses = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    // Calculate expected cash and difference (only cash returns reduce drawer)
    const actualCloseCash = Math.round(Number(closingCash) * 100) / 100;
    const expectedCash = Math.round((shift.openingCash + totalCashSales - totalCashReturns - totalExpenses) * 100) / 100;
    const cashDifference = Math.round((actualCloseCash - expectedCash) * 100) / 100;

    // End all active staff sessions for this shift
    const activeSessions = await db.staffSession.findMany({
      where: {
        counterShiftId: shift.id,
        sessionStatus: 'Active',
      },
    });

    if (activeSessions.length > 0) {
      await db.staffSession.updateMany({
        where: {
          id: { in: activeSessions.map(s => s.id) },
        },
        data: {
          logoutTime: new Date(),
          sessionStatus: 'Ended',
        },
      });
    }

    // Update the shift
    const closedShift = await db.counterShift.update({
      where: { id: shift.id },
      data: {
        closedBy: userId,
        closingCash: actualCloseCash,
        closingNote: closingNote?.trim() || null,
        closingTime: new Date(),
        totalSales: Math.round(totalSales * 100) / 100,
        totalCashSales: Math.round(totalCashSales * 100) / 100,
        totalUpiSales: Math.round(totalUpiSales * 100) / 100,
        totalCardSales: Math.round(totalCardSales * 100) / 100,
        totalCreditSales: Math.round(totalCreditSales * 100) / 100,
        totalReturns: Math.round(totalReturns * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalInvoices,
        expectedCash,
        cashDifference,
        shiftStatus: 'Closed',
      },
      include: {
        counter: { select: { id: true, name: true, location: true } },
        openedByUser: { select: { id: true, name: true, username: true } },
        closedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'SHIFT_CLOSE',
        module: 'counter-shifts',
        details: `Shift closed for ${shift.counter.name}. Sales: ₹${totalSales.toLocaleString('en-IN')}, Expected: ₹${expectedCash.toLocaleString('en-IN')}, Difference: ₹${cashDifference.toLocaleString('en-IN')}`,
      },
    });

    return NextResponse.json({ success: true, data: closedShift });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
