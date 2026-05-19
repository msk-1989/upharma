import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

type NotificationType = 'low_stock' | 'expiring_soon' | 'expired' | 'sales_summary' | 'system';
type Severity = 'info' | 'warning' | 'critical';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;       // ISO date
  read: boolean;
  actionUrl?: string;
  severity: Severity;
}

// Severity weight for sorting (lower = higher priority)
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const now = new Date();

    // Today boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 90-day window for "expiring soon"
    const ninetyDaysFromNow = new Date(now);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    ninetyDaysFromNow.setHours(23, 59, 59, 999);

    // ── Fetch data in parallel ──────────────────────────────────────────────

    const [medicinesWithBatches, expiringBatches, expiredBatches, todaySales] =
      await Promise.all([
        // All active medicines with their active batches (for low-stock calc)
        db.medicine.findMany({
          where: { active: true },
          include: {
            batches: { where: { active: true }, select: { id: true, stockQty: true } },
          },
        }),

        // Batches expiring within 90 days that still have stock
        db.medicineBatch.findMany({
          where: {
            active: true,
            stockQty: { gt: 0 },
            expiryDate: { gt: now, lte: ninetyDaysFromNow },
          },
          include: {
            medicine: { select: { id: true, name: true } },
          },
          orderBy: { expiryDate: 'asc' },
          take: 30,
        }),

        // Batches already expired that still have stock
        db.medicineBatch.findMany({
          where: {
            active: true,
            stockQty: { gt: 0 },
            expiryDate: { lt: now },
          },
          include: {
            medicine: { select: { id: true, name: true } },
          },
          orderBy: { expiryDate: 'asc' },
          take: 30,
        }),

        // Today's completed sales
        db.sale.findMany({
          where: {
            status: 'Completed',
            date: { gte: todayStart, lte: todayEnd },
          },
          select: { id: true, grandTotal: true, date: true },
        }),
      ]);

    const notifications: Notification[] = [];

    // ── 1. Low stock alerts ─────────────────────────────────────────────────
    for (const med of medicinesWithBatches) {
      const totalStock = med.batches.reduce((sum, b) => sum + b.stockQty, 0);

      if (totalStock <= med.reorderLevel) {
        const severity: Severity = totalStock === 0 ? 'critical' : 'warning';

        notifications.push({
          id: `low-stock-${med.id}`,
          type: 'low_stock',
          title: totalStock === 0
            ? `${med.name} is out of stock`
            : `${med.name} is running low`,
          message: totalStock === 0
            ? `No stock available. Reorder level: ${med.reorderLevel} ${med.baseUnit}s.`
            : `Only ${totalStock} ${med.baseUnit}${totalStock !== 1 ? 's' : ''} remaining — reorder level is ${med.reorderLevel}.`,
          timestamp: now.toISOString(),
          read: false,
          actionUrl: `/medicines/${med.id}`,
          severity,
        });
      }
    }

    // ── 2. Expiring soon alerts ─────────────────────────────────────────────
    for (const batch of expiringBatches) {
      const daysLeft = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      notifications.push({
        id: `expiring-${batch.id}`,
        type: 'expiring_soon',
        title: `${batch.medicine.name} (Batch ${batch.batchNo}) expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        message: `${batch.stockQty} units in stock. Expiry date: ${batch.expiryDate.toLocaleDateString()}. Consider promoting or returning.`,
        timestamp: batch.expiryDate.toISOString(),
        read: false,
        actionUrl: `/medicines/${batch.medicineId}`,
        severity: daysLeft <= 30 ? 'critical' : 'warning',
      });
    }

    // ── 3. Expired medicines (still have stock) ─────────────────────────────
    for (const batch of expiredBatches) {
      const daysSinceExpiry = Math.ceil(
        (now.getTime() - batch.expiryDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      notifications.push({
        id: `expired-${batch.id}`,
        type: 'expired',
        title: `${batch.medicine.name} (Batch ${batch.batchNo}) has expired`,
        message: `Expired ${daysSinceExpiry} day${daysSinceExpiry !== 1 ? 's' : ''} ago. ${batch.stockQty} units still in stock — remove or return to supplier.`,
        timestamp: batch.expiryDate.toISOString(),
        read: false,
        actionUrl: `/medicines/${batch.medicineId}`,
        severity: 'critical',
      });
    }

    // ── 4. Today's sales summary ────────────────────────────────────────────
    const salesCount = todaySales.length;
    const salesTotal = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

    notifications.push({
      id: `sales-summary-${todayStart.toISOString().slice(0, 10)}`,
      type: 'sales_summary',
      title: `Today's sales: ${salesCount} invoice${salesCount !== 1 ? 's' : ''}`,
      message: `₹${salesTotal.toFixed(2)} in revenue across ${salesCount} completed sale${salesCount !== 1 ? 's' : ''} today.`,
      timestamp: now.toISOString(),
      read: false,
      actionUrl: '/sales',
      severity: 'info',
    });

    // ── Sort: critical → warning → info, then newest first ──────────────────
    notifications.sort((a, b) => {
      const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit to 50
    const limited = notifications.slice(0, 50);
    const unreadCount = limited.length;

    return NextResponse.json({
      notifications: limited,
      unreadCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/notifications] Error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
