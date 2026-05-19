import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/cash-withdrawals — Record a cash withdrawal/expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { counterShiftId, amount, reason, withdrawnBy } = body;

    if (!counterShiftId) {
      return NextResponse.json({ success: false, error: 'Counter shift ID is required' }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'A valid positive amount is required' }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Reason for withdrawal is required' }, { status: 400 });
    }
    if (!withdrawnBy) {
      return NextResponse.json({ success: false, error: 'Withdrawn by (user ID) is required' }, { status: 400 });
    }

    // Verify shift exists and is open
    const shift = await db.counterShift.findUnique({
      where: { id: counterShiftId },
      select: { id: true, shiftStatus: true },
    });
    if (!shift) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }
    if (shift.shiftStatus !== 'Open') {
      return NextResponse.json({ success: false, error: 'Can only record withdrawals for an open shift' }, { status: 400 });
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: withdrawnBy },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create the withdrawal
    const withdrawal = await db.cashWithdrawal.create({
      data: {
        counterShiftId,
        amount: Math.round(Number(amount) * 100) / 100,
        reason: reason.trim(),
        withdrawnBy,
      },
      include: {
        counterShift: { select: { id: true } },
        withdrawnByUser: { select: { id: true, name: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: withdrawnBy,
        action: 'CASH_WITHDRAWAL',
        module: 'counter-shifts',
        details: `Cash withdrawal of ₹${Number(amount).toLocaleString('en-IN')} — ${reason.trim()}`,
      },
    });

    return NextResponse.json({ success: true, data: withdrawal }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
