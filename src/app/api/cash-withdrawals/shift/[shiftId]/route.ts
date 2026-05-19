import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/cash-withdrawals/shift/[shiftId] — Return all cash withdrawals for a specific shift
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params;

    // Verify shift exists
    const shift = await db.counterShift.findUnique({
      where: { id: shiftId },
      select: { id: true, shiftStatus: true },
    });
    if (!shift) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }

    const withdrawals = await db.cashWithdrawal.findMany({
      where: { counterShiftId: shiftId },
      include: {
        withdrawnByUser: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = Math.round(withdrawals.reduce((sum, w) => sum + w.amount, 0) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        withdrawals,
        totalAmount,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
