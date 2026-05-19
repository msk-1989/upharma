import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync/export
 * Export all data from the current database as JSON.
 * Used for syncing data between local (SQLite) and cloud (PostgreSQL).
 *
 * Body: { since?: string } — ISO date to export only records changed after this date
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const since = body.since ? new Date(body.since) : null;

    const whereClause: any = {};
    if (since) {
      whereClause.updatedAt = { gte: since };
    }

    const [
      users, settings, racks, suppliers, doctors, customers,
      medicines, batches, sales, saleItems,
      purchases, purchaseItems, returns, returnItems,
    ] = await Promise.all([
      db.user.findMany({ where: whereClause, orderBy: { updatedAt: 'asc' } }),
      db.setting.findMany({ orderBy: { key: 'asc' } }),
      db.rack.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.supplier.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.doctor.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.customer.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.medicine.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.medicineBatch.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.sale.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.saleItem.findMany({ orderBy: { createdAt: 'asc' } }),
      db.purchase.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.purchaseItem.findMany({ orderBy: { createdAt: 'asc' } }),
      db.return.findMany({ where: since ? whereClause : undefined, orderBy: { updatedAt: 'asc' } }),
      db.returnItem.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      since: since?.toISOString() || null,
      counts: {
        users: users.length, settings: settings.length,
        racks: racks.length, suppliers: suppliers.length,
        doctors: doctors.length, customers: customers.length,
        medicines: medicines.length, batches: batches.length,
        sales: sales.length, saleItems: saleItems.length,
        purchases: purchases.length, purchaseItems: purchaseItems.length,
        returns: returns.length, returnItems: returnItems.length,
      },
      data: {
        users, settings, racks, suppliers, doctors, customers,
        medicines, batches, sales, saleItems,
        purchases, purchaseItems, returns, returnItems,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
