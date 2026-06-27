import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTodayIST, getTomorrowIST } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// GET /api/counter-shifts — Get active shift info with live summary
export async function GET() {
  try {
    const activeShift = await db.counterShift.findFirst({
      where: { shiftStatus: 'Open' },
      include: {
        counter: { select: { id: true, name: true, location: true, printerName: true } },
        openedByUser: { select: { id: true, name: true, username: true } },
        closedByUser: { select: { id: true, name: true, username: true } },
        staffSessions: {
          where: { sessionStatus: 'Active' },
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeShift) {
      return NextResponse.json({ success: true, data: null });
    }

    // Calculate live summary from DB
    const sales = await db.sale.findMany({
      where: {
        counterShiftId: activeShift.id,
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
        createdAt: { gte: activeShift.createdAt },
        type: 'SALE_RETURN',
      },
    });
    const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);

    // Cash returns only: look up original sale payment mode
    const retRefIds = returns.map(r => r.referenceId);
    const retOrigSales = retRefIds.length > 0
      ? await db.sale.findMany({ where: { id: { in: retRefIds } }, select: { id: true, paymentMode: true } })
      : [];
    const cashRetSaleIds = new Set(retOrigSales.filter(s => s.paymentMode === 'Cash').map(s => s.id));
    const totalCashReturns = returns.filter(r => cashRetSaleIds.has(r.referenceId)).reduce((sum, r) => sum + r.totalAmount, 0);

    // Cash withdrawals for this shift
    const withdrawals = await db.cashWithdrawal.findMany({
      where: { counterShiftId: activeShift.id },
    });
    const totalExpenses = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    const liveSummary = {
      totalSales: Math.round(totalSales * 100) / 100,
      totalCashSales: Math.round(totalCashSales * 100) / 100,
      totalCardSales: Math.round(totalCardSales * 100) / 100,
      totalUpiSales: Math.round(totalUpiSales * 100) / 100,
      totalCreditSales: Math.round(totalCreditSales * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      totalCashReturns: Math.round(totalCashReturns * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalInvoices,
    };

    return NextResponse.json({
      success: true,
      data: {
        shift: activeShift,
        liveSummary,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/counter-shifts — Open a new counter shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { counterId, openingCash, openingNote, userId } = body;

    if (!counterId) {
      return NextResponse.json({ success: false, error: 'Counter ID is required' }, { status: 400 });
    }
    if (openingCash === undefined || openingCash === null) {
      return NextResponse.json({ success: false, error: 'Opening cash amount is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Auto-open the day if not already open (unified flow: one step starts everything)
    try {
      const today = getTodayIST();
      const tomorrow = getTomorrowIST();
      const existingDay = await db.dayClose.findFirst({
        where: { date: { gte: today, lt: tomorrow }, status: 'Open' },
        select: { id: true },
      });
      if (!existingDay) {
        await db.dayClose.create({
          data: {
            date: new Date(),
            openCash: Math.round(Number(openingCash) * 100) / 100,
            status: 'Open',
            openedBy: userId,
          },
        });
        // Create audit log for auto day open
        await db.auditLog.create({
          data: {
            userId,
            action: 'DAY_OPEN',
            module: 'counter-shifts',
            details: 'Day auto-opened when counter shift was started',
          },
        });
      }
    } catch (dayErr) {
      // Log but don't block — graceful degradation
      console.error('Auto day-open check failed:', dayErr);
    }

    // Verify counter exists and is active
    const counter = await db.counter.findUnique({ where: { id: counterId } });
    if (!counter) {
      return NextResponse.json({ success: false, error: 'Counter not found' }, { status: 404 });
    }
    if (counter.status === 'Inactive') {
      return NextResponse.json({ success: false, error: 'Counter is inactive and cannot be used' }, { status: 400 });
    }

    // Check if there is already an open shift for this counter
    const existingShift = await db.counterShift.findFirst({
      where: { counterId, shiftStatus: 'Open' },
    });
    if (existingShift) {
      return NextResponse.json(
        { success: false, error: 'This counter already has an active shift. Close it before opening a new one.' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create the shift
    const shift = await db.counterShift.create({
      data: {
        counterId,
        openedBy: userId,
        openingCash: Math.round(Number(openingCash) * 100) / 100,
        openingNote: openingNote?.trim() || null,
        shiftStatus: 'Open',
      },
      include: {
        counter: { select: { id: true, name: true, location: true } },
        openedByUser: { select: { id: true, name: true, username: true } },
      },
    });

    // Auto-create a staff session for the opener
    await db.staffSession.create({
      data: {
        userId,
        counterShiftId: shift.id,
        counterId,
        sessionStatus: 'Active',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'SHIFT_OPEN',
        module: 'counter-shifts',
        details: `Shift opened for ${counter.name} with Rs.${Number(openingCash).toLocaleString('en-IN')} cash`,
      },
    });

    return NextResponse.json({ success: true, data: shift }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
