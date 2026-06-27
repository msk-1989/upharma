import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  activeTokens,
  generateSyncToken,
  verifySyncToken,
} from '@/app/api/sync/register/route';

export const dynamic = 'force-dynamic';

// ================================================================
// JWT Token Constants & Legacy API Key
// ================================================================

const SYNC_JWT_SECRET = process.env.SYNC_JWT_SECRET || 'upharma-sync-jwt-secret-2026';
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'upharma-sync-2026';

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
  stockConflicts?: Record<string, unknown>[];
  auditLogs?: Record<string, unknown>[];
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
  syncBatchId?: string;
  checksum?: string;
}

interface ConflictEntry {
  type: string;
  identifier: string;
  reason: string;
  clientRecord?: Record<string, unknown>;
  serverRecord?: Record<string, unknown>;
}

// ================================================================
// Duplicate Batch Detection (Module-Level Set)
// ================================================================

/**
 * Set of already-processed syncBatchId values.
 * Prevents re-processing duplicate push batches from retries or network issues.
 */
const processedBatches = new Set<string>();

// ================================================================
// JWT-Based Device Authentication (with Legacy Fallback)
// ================================================================

/**
 * Verify the sync request using JWT Bearer token first, falling back to legacy API key.
 *
 * Priority:
 *  1. Authorization: Bearer <token> — JWT verification
 *  2. x-sync-api-key header — legacy API key (logs a deprecation warning)
 *
 * Returns the authenticated device info if valid, or null if authentication fails.
 */
function authenticateRequest(
  request: NextRequest
): { deviceId: string; deviceName: string; method: 'jwt' | 'legacy' } | null {
  // Attempt 1: JWT Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifySyncToken(token);
    if (payload) {
      return {
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        method: 'jwt',
      };
    }
    // Token present but invalid/expired — do NOT fall through to legacy
    return null;
  }

  // Attempt 2: Legacy API key fallback (backward compatibility)
  const apiKey = request.headers.get('x-sync-api-key');
  if (apiKey && apiKey === SYNC_API_KEY) {
    console.warn(
      '[SYNC] WARNING: Legacy x-sync-api-key authentication used. ' +
        'Please migrate to JWT device tokens via POST /api/sync/register.'
    );
    return {
      deviceId: 'legacy-device',
      deviceName: 'legacy-client',
      method: 'legacy',
    };
  }

  return null;
}

/**
 * Return an unauthorized response for invalid/missing credentials.
 */
function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        'Authentication required. Provide Authorization: Bearer <token> or x-sync-api-key header.',
    },
    { status: 401 }
  );
}

// ================================================================
// Token Rotation Helper
// ================================================================

/**
 * Create a new token for the authenticated device and return the headers
 * to set on the response for token rotation.
 */
function rotateToken(deviceId: string, deviceName: string): HeadersInit {
  const newToken = generateSyncToken(deviceId, deviceName);
  const payload = verifySyncToken(newToken);
  return {
    'x-new-sync-token': newToken,
    'x-sync-token-expires': payload ? new Date(payload.expiresAt).toISOString() : '',
  };
}

// ================================================================
// POST /api/sync — Full bidirectional sync (Combined Push + Pull)
// ================================================================

/**
 * POST /api/sync
 *
 * Enterprise-grade bidirectional sync endpoint:
 *  - JWT device authentication with legacy API key fallback
 *  - syncBatchId + checksum duplicate detection
 *  - Stock conflict persistence
 *  - Incremental saleItems pull
 *  - Token rotation on every successful sync
 *
 * COMBINED PUSH-PULL: The client sends push data and receives pull data
 * in a single API call. The server response always contains full serverData
 * (pull) regardless of whether clientData (push) was provided.
 */
export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // Authentication: JWT token (primary) or legacy API key (fallback)
  // ------------------------------------------------------------------
  const auth = authenticateRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const body: SyncRequestBody = await request.json();
    const lastSyncAt = body.lastSyncAt ? new Date(body.lastSyncAt) : null;
    const clientData = body.clientData || {};
    const deviceInfo = body.deviceInfo || {};

    // ------------------------------------------------------------------
    // Duplicate Batch Detection (syncBatchId + checksum)
    // ------------------------------------------------------------------
    const skippedBatches: string[] = [];
    if (body.syncBatchId) {
      if (processedBatches.has(body.syncBatchId)) {
        console.warn(
          `[SYNC] Duplicate batch detected — skipping. syncBatchId=${body.syncBatchId}, checksum=${body.checksum || 'N/A'}`
        );
        skippedBatches.push(body.syncBatchId);
      } else {
        processedBatches.add(body.syncBatchId);
      }
    }

    // If this entire batch is a duplicate, skip push processing but still return pull data
    if (skippedBatches.includes(body.syncBatchId || '')) {
      const serverData = await fetchServerPullData(lastSyncAt);
      const newHeaders = rotateToken(auth.deviceId, auth.deviceName);

      return NextResponse.json(
        {
          success: true,
          syncTimestamp: new Date().toISOString(),
          serverData,
          syncReport: {
            pushed: {},
            pulled: countPulledRecords(serverData),
            conflicts: [],
            skippedBatches,
            note: 'Batch was previously processed — push data skipped.',
          },
        },
        { headers: newHeaders }
      );
    }

    const conflicts: ConflictEntry[] = [];
    const pushed: Record<string, number> = {};

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

    // 1g. Process stock conflicts from client — PERSIST TO DATABASE
    // Stock conflicts are now persisted to the AuditLog table for admin review,
    // in addition to structured console logging.
    if (clientData.stockConflicts && clientData.stockConflicts.length > 0) {
      let persistedCount = 0;
      for (const conflict of clientData.stockConflicts) {
        // Attempt to persist to AuditLog table
        try {
          await db.auditLog.create({
            data: {
              userId: (conflict.userId as string) || null,
              action: 'STOCK_CONFLICT',
              module: 'sync',
              details: JSON.stringify({
                source: 'desktop-client',
                deviceId: auth.deviceId,
                medicineId: conflict.medicineId,
                medicineName: conflict.medicineName,
                clientQty: conflict.clientQuantity,
                serverQty: conflict.serverQuantity,
                resolvedAction: conflict.resolvedAction,
                timestamp: conflict.timestamp || new Date().toISOString(),
              }),
              ipAddress: null,
            } as never,
          });
          persistedCount++;
        } catch (err) {
          // Audit log creation failed — fall through to console
        }

        // Structured console log for monitoring and debugging
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'STOCK_CONFLICT',
            deviceId: auth.deviceId,
            conflict: {
              medicineId: conflict.medicineId,
              medicineName: conflict.medicineName,
              clientQuantity: conflict.clientQuantity,
              serverQuantity: conflict.serverQuantity,
              resolvedAction: conflict.resolvedAction,
            },
            timestamp: new Date().toISOString(),
          })
        );
      }

      pushed.stockConflicts = clientData.stockConflicts.length;
      console.log(
        `[SYNC] Processed ${clientData.stockConflicts.length} stock conflict reports ` +
          `(${persistedCount} persisted to AuditLog)`
      );
    }

    // 1h. Process audit logs from client (offline audit logs)
    if (clientData.auditLogs && clientData.auditLogs.length > 0) {
      let count = 0;
      for (const record of clientData.auditLogs) {
        try {
          await db.auditLog.create({
            data: {
              userId: record.userId as string,
              action: record.action as string,
              entity: record.entity as string,
              entityId: (record.entityId as string) || null,
              details: record.details ? (record.details as string) : null,
            } as never,
          });
          count++;
        } catch (err) {
          // Silently skip — audit log duplication is acceptable
        }
      }
      pushed.auditLogs = count;
    }

    // ------------------------------------------------------------------
    // PHASE 2 — PULL: Fetch data from server for client
    // ------------------------------------------------------------------
    // COMBINED PUSH-PULL: The server response always includes full serverData
    // even when the client sends push data. This enables a single round-trip
    // for bidirectional sync, reducing latency on slow network connections.
    // ------------------------------------------------------------------

    const serverData = await fetchServerPullData(lastSyncAt);
    const pulled = countPulledRecords(serverData);

    // ------------------------------------------------------------------
    // Token Rotation: Issue new token on every successful sync
    // ------------------------------------------------------------------
    const newHeaders = rotateToken(auth.deviceId, auth.deviceName);

    const syncTimestamp = new Date();

    return NextResponse.json(
      {
        success: true,
        syncTimestamp: syncTimestamp.toISOString(),
        serverData,
        syncReport: {
          pushed,
          pulled,
          conflicts: conflicts.length > 0 ? conflicts : [],
          skippedBatches,
        },
      },
      { headers: newHeaders }
    );
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
  // Authentication: JWT token (primary) or legacy API key (fallback)
  const auth = authenticateRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const [
      medicineCount,
      batchCount,
      customerCount,
      supplierCount,
      salesCount,
      purchaseCount,
      userCount,
    ] = await Promise.all([
      db.medicine.count(),
      db.medicineBatch.count(),
      db.customer.count(),
      db.supplier.count(),
      db.sale.count(),
      db.purchase.count(),
      db.user.count({ where: { active: true } }),
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
        users: userCount,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SYNC] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ================================================================
// Server Pull Data Fetcher (shared between POST and duplicate-skip paths)
// ================================================================

/**
 * Fetch all data needed for the client pull phase.
 * This function is extracted to avoid code duplication between the
 * normal sync path and the duplicate-batch-skip short-circuit path.
 */
async function fetchServerPullData(lastSyncAt: Date | null) {
  // ------------------------------------------------------------------
  // Reference data: full sync (all records)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Transactional data: incremental sync since lastSyncAt
  // ------------------------------------------------------------------
  const salesWhere: Record<string, unknown> = {};
  const saleItemsWhere: Record<string, unknown> = {};
  const purchasesWhere: Record<string, unknown> = {};
  if (lastSyncAt) {
    salesWhere.updatedAt = { gte: lastSyncAt };
    // FIX: saleItems now uses incremental pull (same as sales)
    // Previously saleItems pulled ALL records every sync, which sent
    // thousands of items every 5 minutes. Now only changed items are sent.
    saleItemsWhere.updatedAt = { gte: lastSyncAt };
    purchasesWhere.updatedAt = { gte: lastSyncAt };
  }

  const [sales, saleItems, purchases] = await Promise.all([
    db.sale.findMany({
      where: Object.keys(salesWhere).length > 0 ? salesWhere : undefined,
      orderBy: { createdAt: 'desc' },
    }),
    // FIX: Incremental saleItems pull — only items updated since lastSyncAt
    db.saleItem.findMany({
      where: Object.keys(saleItemsWhere).length > 0 ? saleItemsWhere : undefined,
      orderBy: { createdAt: 'asc' },
    }),
    db.purchase.findMany({
      where: Object.keys(purchasesWhere).length > 0 ? purchasesWhere : undefined,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // ------------------------------------------------------------------
  // Users: pull active users for offline PIN-based authentication
  // ------------------------------------------------------------------
  // NOTE: The PIN field is included for offline auth verification.
  // The client-side MUST hash the PIN (e.g., SHA-256) before storing it
  // locally. Never store the raw PIN on the client device.
  const users = await db.user.findMany({
    where: { active: true },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      pin: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  });

  return {
    medicines: serializeDates(medicines),
    medicineBatches: serializeDates(medicineBatches),
    customers: serializeDates(customers),
    suppliers: serializeDates(suppliers),
    settings: serializeDates(settings),
    sales: serializeDates(sales),
    saleItems: serializeDates(saleItems),
    purchases: serializeDates(purchases),
    users: serializeDates(users),
  };
}

/**
 * Count the number of records in each pull data category for the sync report.
 */
function countPulledRecords(serverData: Record<string, unknown[]>): Record<string, number> {
  return {
    medicines: serverData.medicines?.length ?? 0,
    batches: serverData.medicineBatches?.length ?? 0,
    customers: serverData.customers?.length ?? 0,
    suppliers: serverData.suppliers?.length ?? 0,
    settings: serverData.settings?.length ?? 0,
    sales: serverData.sales?.length ?? 0,
    saleItems: serverData.saleItems?.length ?? 0,
    purchases: serverData.purchases?.length ?? 0,
    users: serverData.users?.length ?? 0,
  };
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
