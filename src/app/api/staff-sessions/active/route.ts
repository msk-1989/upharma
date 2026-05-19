import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/staff-sessions/active — Return all active staff sessions
export async function GET() {
  try {
    const activeSessions = await db.staffSession.findMany({
      where: { sessionStatus: 'Active' },
      include: {
        user: { select: { id: true, name: true, username: true, role: true } },
        counter: { select: { id: true, name: true, location: true } },
        counterShift: { select: { id: true, openingCash: true, createdAt: true } },
      },
      orderBy: { loginTime: 'asc' },
    });

    // For each active session, calculate the live invoice count
    const sessionsWithCounts = await Promise.all(
      activeSessions.map(async (session) => {
        const invoiceCount = await db.sale.count({
          where: {
            counterShiftId: session.counterShiftId,
            userId: session.userId,
            createdAt: { gte: session.loginTime },
            status: 'Completed',
          },
        });

        return {
          id: session.id,
          userId: session.userId,
          counterShiftId: session.counterShiftId,
          counterId: session.counterId,
          loginTime: session.loginTime,
          sessionStatus: session.sessionStatus,
          _liveInvoiceCount: invoiceCount,
          user: session.user,
          counter: session.counter,
          counterShift: session.counterShift,
        };
      })
    );

    return NextResponse.json({ success: true, data: sessionsWithCounts });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
