import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ================================================================
// Types
// ================================================================

interface SyncClientData {
  sales?: Record<string, unknown>[];
  saleItems?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  customers?: Record<string, unknown>[];
  returns?: Record<string, unknown>[];
  returnItems?: Record<string, unknown>[];
}

interface DeviceInfo {
  deviceId?: string;
  appName?: string;
  appVersion?: string;
}

interface SyncRequestBody {
  lastSyncAt?: string;
  clientData?: SyncClientData;
  deviceInfo?: DeviceInfo;
}

interface ConflictEntry {
  type: string;
  identifier: string;
  reason: string;
  clientRecord?: Record<string, unknown>;
  serverRecord?: Record<string, unknown>;
}

// ================================================================
// POST /api/sync — Full bidirectional sync
// ================================================================

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequestBody = await request.json();
    const lastSyncAt = body.lastSyncAt ? new Date(body.lastSyncAt) : null;
    const clientData = body.clientData || {};
    const deviceInfo = body.deviceInfo || {};

    const conflicts: ConflictEntry[] = [];
    const pushed: Record<string, number> = {};
    const pulled: Record<string, number> = {};

    // ------------------------------------------------------------------
    // PHASE 1 — PUSH: Insert client data into server
    // ------------------------------------------------------------------

    // 1a. Push customers (new customers added offline)
    if (clientData.customers && clientData.customers.length > 0) {
      let count = 0;
      for (const record of clientData.customers) {
        const { id, createdAt, updatedAt, ...rest } = record as Record<string, unknown>;

        // Check if customer with same name+phone already exists
        const existing = await db.customer.findFirst({
          where: {
            AND: [
              { name: rest.name as string },
              rest.phone ? { phone: rest.phone as string } : {},
            ],
          },
        });

        if (existing) {
          conflicts.push({
            type: 'customer',
            identifier: `name=${rest.name}, phone=${rest.phone || 'N/A'}`,
            reason: 'Customer with same name and phone already exists',
            clientRecord: record as Record<string, unknown>,
            serverRecord: existing as unknown as Record<string, unknown>,
          });
        } else {
          try {
            await db.customer.create({
              data: {
                ...(rest as Record<string, unknown>),
                id: id as string,
              } as never,
            });
            count++;
          } catch (err) {
            conflicts.push({
              type: 'customer',
              identifier: String(id),
              reason: `Create failed: ${err instanceof Error ? err.message : 'Unknown'}`,
              clientRecord: record as Record<string, unknown>,
            });
          }
        }
      }
      pushed.customers = count;
    }

    // 1b. Push sales (sales created offline)
    if (clientData.sales && clientData.sales.length > 0) {
      let count = 0;
      for (const record of clientData.sales) {
        const { id, createdAt, updatedAt, ...rest } = record as Record<string, unknown>;
        const invoiceNo = rest.invoiceNo as string;

        // Check if sale with same invoiceNo exists on server
        const existing = await db.sale.findUnique({
          where: { invoiceNo },
        });

        if (existing) {
          // Append -SYNC-{timestamp} to make it unique
          const syncSuffix = `-SYNC-${Date.now()}`;
          const newInvoiceNo = `${invoiceNo}${syncSuffix}`;

          try {
            await db.sale.create({
              data: {
                ...(rest as Record<string, unknown>),
                id: id as string,
                invoiceNo: newInvoiceNo,
              } as never,
            });
            count++;

            conflicts.push({
              type: 'sale',
              identifier: invoiceNo,
              reason: `Duplicate invoiceNo on server, renamed to ${newInvoiceNo}`,
              clientRecord: record as Record<string, unknown>,
              serverRecord: existing as unknown as Record<string, unknown>,
            });
          } catch (err) {
            conflicts.push({
              type: 'sale',
              identifier: invoiceNo,
              reason: `Create failed even with renamed invoice: ${err instanceof Error ? err.message : 'Unknown'}`,
              clientRecord: record as Record<string, unknown>,
            });
          }
        } else {
          try {
            await db.sale.create({
              data: {
                ...(rest as Record<string, unknown>),
                id: id as string,
              } as never,
            });
            count++;
          } catch (err) {
            conflicts.push({
              type: 'sale',
              identifier: invoiceNo || String(id),
              reason: `Create failed: ${err instanceof Error ? err.message : 'Unknown'}`,
              clientRecord: record as Record<string, unknown>,
            });
          }
        }
      }
      pushed.sales = count;
    }

    // 1c. Push sale items
    if (clientData.saleItems && clientData.saleItems.length > 0) {
      let count = 0;
      for (const record of clientData.saleItems) {
        const { id, createdAt, updatedAt, ...rest } = record as Record<string, unknown>;
        try {
          await db.saleItem.create({
            data: {
              ...(rest as Record<string, unknown>),
              id: id as string,
            } as never,
          });
          count++;
        } catch (err) {
          // Silently skip — likely a foreign key issue if parent sale failed
        }
      }
      pushed.saleItems = count;
    }

    // 1d. Push payments
    if (clientData.payments && clientData.payments.length > 0) {
      let count = 0;
      for (const record of clientData.payments) {
        const { id, createdAt, ...rest } = record as Record<string, unknown>;
        try {
          await db.payment.create({
            data: {
              ...(rest as Record<string, unknown>),
              id: id as string,
            } as never,
          });
          count++;
        } catch (err) {
          conflicts.push({
            type: 'payment',
            identifier: String(id),
            reason: `Create failed: ${err instanceof Error ? err.message : 'Unknown'}`,
            clientRecord: record as Record<string, unknown>,
          });
        }
      }
      pushed.payments = count;
    }

    // 1e. Push returns
    if (clientData.returns && clientData.returns.length > 0) {
      let count = 0;
      for (const record of clientData.returns) {
        const { id, createdAt, updatedAt, ...rest } = record as Record<string, unknown>;
        const returnNo = rest.returnNo as string;

        const existing = await db.return.findUnique({
          where: { returnNo },
        });

        if (existing) {
          const syncSuffix = `-SYNC-${Date.now()}`;
          const newReturnNo = `${returnNo}${syncSuffix}`;

          try {
            await db.return.create({
              data: {
                ...(rest as Record<string, unknown>),
                id: id as string,
                returnNo: newReturnNo,
              } as never,
            });
            count++;

            conflicts.push({
              type: 'return',
              identifier: returnNo,
              reason: `Duplicate returnNo on server, renamed to ${newReturnNo}`,
              clientRecord: record as Record<string, unknown>,
              serverRecord: existing as unknown as Record<string, unknown>,
            });
          } catch (err) {
            conflicts.push({
              type: 'return',
              identifier: returnNo,
              reason: `Create failed even with renamed returnNo: ${err instanceof Error ? err.message : 'Unknown'}`,
              clientRecord: record as Record<string, unknown>,
            });
          }
        } else {
          try {
            await db.return.create({
              data: {
                ...(rest as Record<string, unknown>),
                id: id as string,
              } as never,
            });
            count++;
          } catch (err) {
            conflicts.push({
              type: 'return',
              identifier: returnNo || String(id),
              reason: `Create failed: ${err instanceof Error ? err.message : 'Unknown'}`,
              clientRecord: record as Record<string, unknown>,
            });
          }
        }
      }
      pushed.returns = count;
    }

    // 1f. Push return items
    if (clientData.returnItems && clientData.returnItems.length > 0) {
      let count = 0;
      for (const record of clientData.returnItems) {
        const { id, createdAt, ...rest } = record as Record<string, unknown>;
        try {
          await db.returnItem.create({
            data: {
              ...(rest as Record<string, unknown>),
              id: id as string,
            } as never,
          });
          count++;
        } catch (err) {
          // Silently skip
        }
      }
      pushed.returnItems = count;
    }

    // ------------------------------------------------------------------
    // PHASE 2 — PULL: Fetch data from server for client
    // ------------------------------------------------------------------

    // Reference data: full sync (all records)
    const [
      medicines,
      medicineBatches,
      customers,
      suppliers,
      settings,
    ] = await Promise.all([
      db.medicine.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      db.medicineBatch.findMany({
        orderBy: { updatedAt: 'asc' },
      }),
      db.customer.findMany({
        orderBy: { name: 'asc' },
      }),
      db.supplier.findMany({
        orderBy: { name: 'asc' },
      }),
      db.setting.findMany({
        orderBy: { key: 'asc' },
      }),
    ]);

    pulled.medicines = medicines.length;
    pulled.batches = medicineBatches.length;
    pulled.customers = customers.length;
    pulled.suppliers = suppliers.length;
    pulled.settings = settings.length;

    // Transactional data: incremental sync since lastSyncAt
    const salesWhere: Record<string, unknown> = {};
    const purchasesWhere: Record<string, unknown> = {};
    if (lastSyncAt) {
      salesWhere.updatedAt = { gte: lastSyncAt };
      purchasesWhere.updatedAt = { gte: lastSyncAt };
    }

    const [sales, saleItems, purchases] = await Promise.all([
      db.sale.findMany({
        where: Object.keys(salesWhere).length > 0 ? salesWhere : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      db.saleItem.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      db.purchase.findMany({
        where: Object.keys(purchasesWhere).length > 0 ? purchasesWhere : undefined,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    pulled.sales = sales.length;
    pulled.purchases = purchases.length;

    const syncTimestamp = new Date();

    return NextResponse.json({
      success: true,
      syncTimestamp: syncTimestamp.toISOString(),
      serverData: {
        medicines: serializeDates(medicines),
        medicineBatches: serializeDates(medicineBatches),
        customers: serializeDates(customers),
        suppliers: serializeDates(suppliers),
        settings: serializeDates(settings),
        sales: serializeDates(sales),
        saleItems: serializeDates(saleItems),
        purchases: serializeDates(purchases),
      },
      syncReport: {
        pushed,
        pulled,
        conflicts: conflicts.length > 0 ? conflicts : [],
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SYNC] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ================================================================
// GET /api/sync — Sync status endpoint
// ================================================================

export async function GET(request: NextRequest) {
  try {
    const [medicineCount, batchCount, customerCount, supplierCount, salesCount, purchaseCount] =
      await Promise.all([
        db.medicine.count(),
        db.medicineBatch.count(),
        db.customer.count(),
        db.supplier.count(),
        db.sale.count(),
        db.purchase.count(),
      ]);

    // Get the most recent sale as a proxy for "last sync from any device"
    const latestSale = await db.sale.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      success: true,
      serverTimestamp: new Date().toISOString(),
      lastActivityAt: latestSale?.updatedAt?.toISOString() || null,
      recordCounts: {
        medicines: medicineCount,
        batches: batchCount,
        customers: customerCount,
        suppliers: supplierCount,
        sales: salesCount,
        purchases: purchaseCount,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ================================================================
// Helpers
// ================================================================

/**
 * Convert Date objects in an array to ISO strings for JSON serialization.
 */
function serializeDates<T>(records: T[]): T[] {
  return records.map((record) => {
    if (!record || typeof record !== 'object') return record;
    const obj = { ...record } as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (obj[key] instanceof Date) {
        obj[key] = (obj[key] as Date).toISOString();
      }
    }
    return obj as T;
  });
}
