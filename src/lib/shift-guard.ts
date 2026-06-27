import { db } from '@/lib/db';

/** Roles that bypass shift requirement entirely */
const SHIFT_EXEMPT_ROLES = ['Admin', 'Super Admin'];

/**
 * Check if there is an active counter shift. Returns the CounterShift record if found, null otherwise.
 * Used by API routes to enforce mandatory active shift before transactions.
 *
 * ROLE-BASED RULES:
 * - Admin / Super Admin → ALWAYS allowed (no shift required)
 * - Cashier / Manager → MUST have an active counter shift
 * - Pharmacist → MUST have an active shift to bill (joins existing counter)
 *
 * Pass `userRole` to enable role-based bypass. If not provided, treats as non-exempt.
 * Graceful degradation: on DB error, returns allowed: true.
 */
export async function requireActiveShift(userRole?: string): Promise<{
  allowed: boolean;
  error?: string;
  shift?: {
    id: string;
    counterId: string;
    shiftStatus: string;
  };
  isExempt?: boolean;
}> {
  // Admin/Owner bypass shift requirement
  if (userRole && SHIFT_EXEMPT_ROLES.includes(userRole)) {
    return { allowed: true, isExempt: true };
  }

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
        error: 'No active counter shift found. Please open a counter shift before performing any transactions.',
      };
    }

    return { allowed: true, shift: activeShift };
  } catch {
    // In case of DB error, allow the operation (don't block for technical issues)
    return { allowed: true };
  }
}
