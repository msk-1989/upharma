import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/counters — Return counters with their active shift status
// ?all=true to include inactive counters (for settings management)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';

    const whereClause = showAll ? {} : { status: 'Active' };

    const counters = await db.counter.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { counterShifts: true, assignedUsers: true },
        },
        counterShifts: {
          where: { shiftStatus: 'Open' },
          select: {
            id: true,
            openedBy: true,
            openingCash: true,
            createdAt: true,
            openedByUser: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const countersWithStatus = counters.map((counter) => ({
      id: counter.id,
      name: counter.name,
      location: counter.location,
      printerName: counter.printerName,
      status: counter.status,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
      totalShifts: counter._count.counterShifts,
      assignedUsersCount: counter._count.assignedUsers,
      activeShift: counter.counterShifts[0] || null,
    }));

    return NextResponse.json({ success: true, data: countersWithStatus });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/counters — Create a new counter (Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, printerName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Counter name is required' }, { status: 400 });
    }

    // Check if a counter with the same name already exists
    const existing = await db.counter.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'A counter with this name already exists' }, { status: 400 });
    }

    const counter = await db.counter.create({
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        printerName: printerName?.trim() || null,
        status: 'Active',
      },
    });

    return NextResponse.json({ success: true, data: counter }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
