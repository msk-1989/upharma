import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/counter-shifts/active — Lightweight active shift status (polled frequently)
export async function GET() {
  try {
    const activeShift = await db.counterShift.findFirst({
      where: { shiftStatus: 'Open' },
      select: {
        id: true,
        counterId: true,
        openedBy: true,
        openingCash: true,
        openingNote: true,
        createdAt: true,
        shiftStatus: true,
        counter: { select: { id: true, name: true, location: true } },
        openedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveShift: false,
        },
      });
    }

    // Quick invoice count for the active shift
    const invoiceCount = await db.sale.count({
      where: {
        counterShiftId: activeShift.id,
        status: 'Completed',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasActiveShift: true,
        shift: {
          ...activeShift,
          _liveInvoiceCount: invoiceCount,
        },
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        hasActiveShift: false,
      },
    });
  }
}
