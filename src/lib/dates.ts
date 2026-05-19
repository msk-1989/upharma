/**
 * Timezone-aware date utilities for Indian pharmacy operations.
 * Vercel servers run in UTC; this ensures all date calculations
 * use Indian Standard Time (IST = UTC+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in milliseconds

/**
 * Get the current date in IST, with time set to midnight IST.
 * Used for day boundaries, sales reports, etc.
 */
export function getTodayIST(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();
  // Return a Date object set to midnight IST
  const today = new Date(Date.UTC(year, month, day));
  return today;
}

/**
 * Get tomorrow's date in IST (midnight IST).
 */
export function getTomorrowIST(): Date {
  const today = getTodayIST();
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Format a Date to YYYY-MM-DD string in IST.
 */
export function formatDateIST(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const y = istDate.getUTCFullYear();
  const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(istDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
