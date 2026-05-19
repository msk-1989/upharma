import { db } from '@/lib/db';

/**
 * Check if there is an active counter shift. Returns the CounterShift record if found, null otherwise.
 * Used by API routes to enforce mandatory active shift before transactions.
 * Graceful degradation: on DB error, returns allowed: true so the app doesn't break.
 */
export async function requireActiveShift(): Promise<{
  allowed: boolean;
  error?: string;
  shift?: {
    id: string;
    counterId: string;
    shiftStatus: string;
  };
}> {
  try {
    const activeShift = await db.counterShift.findFirst({
      where: {
        shiftStatus: 'Open',
      },
      select: {
        id: true,
        counterId: true,
        shiftStatus: true,
      },
    });

    if (!activeShift) {
      return {
        allowed: false,
        error: 'No active counter shift found. Please open a shift from the Counter Shift page before performing any transactions.',
      };
    }

    return { allowed: true, shift: activeShift };
  } catch {
    // In case of DB error, allow the operation (don't block for technical issues)
    return { allowed: true };
  }
}
