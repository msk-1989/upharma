import { db } from '@/lib/db';
import { getTodayIST, getTomorrowIST } from '@/lib/dates';

/**
 * Check if today's day is open. Returns the DayClose record if open, null otherwise.
 * Used by API routes to enforce mandatory day-open before transactions.
 */
export async function requireDayOpen(): Promise<{ allowed: boolean; error?: string; dayCloseId?: string }> {
  try {
    const today = getTodayIST();
    const tomorrow = getTomorrowIST();

    const dayClose = await db.dayClose.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
        status: 'Open',
      },
      select: { id: true },
    });

    if (!dayClose) {
      return {
        allowed: false,
        error: 'Day is not open. Please open the day from Day Closing page before performing any transactions.',
      };
    }

    return { allowed: true, dayCloseId: dayClose.id };
  } catch {
    // In case of DB error, allow the operation (don't block for technical issues)
    return { allowed: true };
  }
}
