import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/counter-shifts/history?from=DATE&to=DATE&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const where: Record<string, unknown> = {
      shiftStatus: 'Closed',
    };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [records, total] = await Promise.all([
      db.counterShift.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          counter: { select: { id: true, name: true, location: true } },
          openedByUser: { select: { id: true, name: true, username: true } },
          closedByUser: { select: { id: true, name: true, username: true } },
          staffSessions: {
            select: {
              id: true,
              userId: true,
              loginTime: true,
              logoutTime: true,
              sessionStatus: true,
              totalInvoices: true,
              totalSales: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.counterShift.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
