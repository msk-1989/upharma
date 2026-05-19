import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/staff-sessions/login — Staff clock in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, counterShiftId, counterId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    if (!counterShiftId) {
      return NextResponse.json({ success: false, error: 'Counter shift ID is required' }, { status: 400 });
    }
    if (!counterId) {
      return NextResponse.json({ success: false, error: 'Counter ID is required' }, { status: 400 });
    }

    // Verify shift exists and is open
    const shift = await db.counterShift.findUnique({
      where: { id: counterShiftId },
      select: { id: true, shiftStatus: true, counterId: true },
    });
    if (!shift) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }
    if (shift.shiftStatus !== 'Open') {
      return NextResponse.json({ success: false, error: 'This shift is not open. Cannot start a session.' }, { status: 400 });
    }

    // Verify counterId matches the shift's counter
    if (shift.counterId !== counterId) {
      return NextResponse.json(
        { success: false, error: 'Counter ID does not match the shift\'s counter' },
        { status: 400 }
      );
    }

    // Check if user already has an active session
    const existingSession = await db.staffSession.findFirst({
      where: {
        userId,
        sessionStatus: 'Active',
      },
    });
    if (existingSession) {
      return NextResponse.json(
        { success: false, error: 'You already have an active session. Log out from the current session first.' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, active: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (!user.active) {
      return NextResponse.json({ success: false, error: 'User account is inactive' }, { status: 403 });
    }

    // Create staff session
    const session = await db.staffSession.create({
      data: {
        userId,
        counterShiftId,
        counterId,
        sessionStatus: 'Active',
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        counter: { select: { id: true, name: true } },
        counterShift: { select: { id: true, openingCash: true } },
      },
    });

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
