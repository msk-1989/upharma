import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTodayIST, getTomorrowIST } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// GET /api/day-close/status — Lightweight check for day status
export async function GET() {
  try {
    const today = getTodayIST();
    const tomorrow = getTomorrowIST();

    const dayClose = await db.dayClose.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
      },
      select: { status: true, id: true },
    });

    return NextResponse.json({
      success: true,
      dayStatus: dayClose?.status || null, // 'Open' | 'Closed' | null
    });
  } catch {
    return NextResponse.json({ success: true, dayStatus: null });
  }
}
