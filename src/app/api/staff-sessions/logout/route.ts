import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/staff-sessions/logout — Staff clock out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    // Fetch the session
    const session = await db.staffSession.findUnique({
      where: { id: sessionId },
      include: {
        counterShift: { select: { id: true, shiftStatus: true, createdAt: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.sessionStatus !== 'Active') {
      return NextResponse.json({ success: false, error: 'This session is not active' }, { status: 400 });
    }

    // Calculate total invoices and total sales for this session from sales data
    const sessionSales = await db.sale.findMany({
      where: {
        counterShiftId: session.counterShiftId,
        userId: session.userId,
        createdAt: { gte: session.loginTime },
        status: 'Completed',
      },
    });

    const totalInvoices = sessionSales.length;
    const totalSales = Math.round(sessionSales.reduce((sum, s) => sum + s.grandTotal, 0) * 100) / 100;

    // Update the session
    const updatedSession = await db.staffSession.update({
      where: { id: sessionId },
      data: {
        logoutTime: new Date(),
        sessionStatus: 'Ended',
        totalInvoices,
        totalSales,
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        counter: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
