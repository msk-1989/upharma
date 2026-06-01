// ================================================================
// uPharma Sync Engine — Offline-First Sync for Electron
// Manages local SQLite database and bidirectional sync with cloud.
// ================================================================

const { EventEmitter } = require('events');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// better-sqlite3 is a C++ addon, resolved from the electron/ context
let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('[SyncEngine] Failed to load better-sqlite3. Make sure it is installed.', err.message);
  // Provide a stub that throws on use
  Database = class Stub {
    constructor() { throw new Error('better-sqlite3 is not installed'); }
  };
}

// ================================================================
// Constants
// ================================================================
const SYNC_API_BASE = 'https://upharma.vercel.app';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DB_FILE_NAME = 'upharma-local.db';
const PENDING_TABLES = [
  'local_sales',
  'local_sale_items',
  'local_payments',
  'local_customers',
  'local_returns',
];

// ================================================================
// Schema definitions for local SQLite tables
// ================================================================
const SCHEMA_SQL = `
  -- Sync metadata table
  CREATE TABLE IF NOT EXISTS sync_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    lastSyncAt TEXT,
    deviceId TEXT NOT NULL DEFAULT '',
    syncStatus TEXT NOT NULL DEFAULT 'idle',
    serverTimestamp TEXT,
    lastPushAt TEXT,
    lastPullAt TEXT,
    totalPushCount INTEGER NOT NULL DEFAULT 0,
    totalPullCount INTEGER NOT NULL DEFAULT 0
  );

  -- Local sales (offline-created sales)
  CREATE TABLE IF NOT EXISTS local_sales (
    id TEXT PRIMARY KEY,
    invoiceNo TEXT NOT NULL,
    customerId TEXT,
    customerName TEXT,
    doctorId TEXT,
    prescriptionId TEXT,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    totalDiscount REAL NOT NULL DEFAULT 0,
    cgst REAL NOT NULL DEFAULT 0,
    sgst REAL NOT NULL DEFAULT 0,
    igst REAL NOT NULL DEFAULT 0,
    totalGst REAL NOT NULL DEFAULT 0,
    grandTotal REAL NOT NULL DEFAULT 0,
    paidAmount REAL NOT NULL DEFAULT 0,
    balanceDue REAL NOT NULL DEFAULT 0,
    paymentMode TEXT NOT NULL DEFAULT 'Cash',
    notes TEXT,
    loyaltyPointsUsed INTEGER NOT NULL DEFAULT 0,
    loyaltyPointsEarned INTEGER NOT NULL DEFAULT 0,
    userId TEXT,
    counterShiftId TEXT,
    counterId TEXT,
    status TEXT NOT NULL DEFAULT 'Completed',
    synced INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  -- Local sale items
  CREATE TABLE IF NOT EXISTS local_sale_items (
    id TEXT PRIMARY KEY,
    saleId TEXT NOT NULL,
    medicineId TEXT NOT NULL,
    batchId TEXT,
    medicineName TEXT,
    batchNo TEXT,
    quantity INTEGER NOT NULL,
    unitType TEXT NOT NULL DEFAULT 'strip',
    saleRate REAL NOT NULL,
    mrp REAL NOT NULL,
    gstPercent REAL NOT NULL DEFAULT 12,
    cgst REAL NOT NULL DEFAULT 0,
    sgst REAL NOT NULL DEFAULT 0,
    igst REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    expiryDate TEXT,
    createdAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (saleId) REFERENCES local_sales(id) ON DELETE CASCADE
  );

  -- Local payments
  CREATE TABLE IF NOT EXISTS local_payments (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    saleId TEXT,
    amount REAL NOT NULL,
    mode TEXT NOT NULL DEFAULT 'Cash',
    reference TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Local customers
  CREATE TABLE IF NOT EXISTS local_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    doctorName TEXT,
    balance REAL NOT NULL DEFAULT 0,
    totalPurchases REAL NOT NULL DEFAULT 0,
    loyaltyPoints INTEGER NOT NULL DEFAULT 0,
    creditLimit REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Local returns
  CREATE TABLE IF NOT EXISTS local_returns (
    id TEXT PRIMARY KEY,
    returnNo TEXT NOT NULL,
    type TEXT NOT NULL,
    referenceId TEXT NOT NULL,
    customerId TEXT,
    supplierId TEXT,
    totalAmount REAL NOT NULL DEFAULT 0,
    reason TEXT,
    userId TEXT,
    status TEXT NOT NULL DEFAULT 'Completed',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Local return items
  CREATE TABLE IF NOT EXISTS local_return_items (
    id TEXT PRIMARY KEY,
    returnId TEXT NOT NULL,
    medicineId TEXT NOT NULL,
    batchId TEXT,
    quantity INTEGER NOT NULL,
    unitType TEXT NOT NULL DEFAULT 'strip',
    rate REAL NOT NULL,
    total REAL NOT NULL,
    reason TEXT,
    FOREIGN KEY (returnId) REFERENCES local_returns(id) ON DELETE CASCADE
  );

  -- Cached medicines from server
  CREATE TABLE IF NOT EXISTS local_medicines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    genericName TEXT,
    manufacturer TEXT,
    category TEXT DEFAULT 'General',
    drugSchedule TEXT DEFAULT 'OTC',
    hsnCode TEXT,
    gstPercent REAL DEFAULT 12,
    barcode TEXT,
    alternateBarcodes TEXT,
    baseUnit TEXT DEFAULT 'Tablet',
    unitsPerStrip INTEGER DEFAULT 10,
    stripsPerBox INTEGER DEFAULT 10,
    allowLooseSale INTEGER DEFAULT 1,
    purchaseRate REAL DEFAULT 0,
    saleRate REAL DEFAULT 0,
    mrp REAL DEFAULT 0,
    reorderLevel INTEGER DEFAULT 20,
    imageUrl TEXT,
    active INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Cached batches from server
  CREATE TABLE IF NOT EXISTS local_batches (
    id TEXT PRIMARY KEY,
    medicineId TEXT NOT NULL,
    batchNo TEXT NOT NULL,
    expiryDate TEXT,
    purchaseRate REAL DEFAULT 0,
    saleRate REAL DEFAULT 0,
    mrp REAL DEFAULT 0,
    stockQty INTEGER DEFAULT 0,
    initialStock INTEGER DEFAULT 0,
    supplierId TEXT,
    purchaseDate TEXT,
    rackId TEXT,
    active INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (medicineId) REFERENCES local_medicines(id) ON DELETE CASCADE
  );

  -- Cached suppliers from server
  CREATE TABLE IF NOT EXISTS local_suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contactPerson TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstNumber TEXT,
    drugLicense TEXT,
    balance REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Cached settings from server
  CREATE TABLE IF NOT EXISTS local_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Cached purchases from server
  CREATE TABLE IF NOT EXISTS local_purchases (
    id TEXT PRIMARY KEY,
    invoiceNo TEXT NOT NULL,
    supplierId TEXT NOT NULL,
    poId TEXT,
    date TEXT,
    subtotal REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    totalGst REAL DEFAULT 0,
    grandTotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    balanceDue REAL DEFAULT 0,
    notes TEXT,
    userId TEXT,
    status TEXT DEFAULT 'Completed',
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Sync queue: tracks pending changes to push
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_local_sales_synced ON local_sales(synced);
  CREATE INDEX IF NOT EXISTS idx_local_sale_items_saleId ON local_sale_items(saleId);
  CREATE INDEX IF NOT EXISTS idx_local_payments_synced ON local_payments(synced);
  CREATE INDEX IF NOT EXISTS idx_local_customers_synced ON local_customers(synced);
  CREATE INDEX IF NOT EXISTS idx_local_returns_synced ON local_returns(synced);
  CREATE INDEX IF NOT EXISTS idx_local_batches_medicineId ON local_batches(medicineId);
  CREATE INDEX IF NOT EXISTS idx_local_medicines_name ON local_medicines(name);
  CREATE INDEX IF NOT EXISTS idx_local_medicines_barcode ON local_medicines(barcode);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
`;

// ================================================================
// SyncEngine Class
// ================================================================
class SyncEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      apiBase: options.apiBase || SYNC_API_BASE,
      deviceId: options.deviceId || 'desktop-' + getMachineId(),
      appName: options.appName || 'uPharma Desktop',
      appVersion: options.appVersion || '1.0.0',
      dbPath: options.dbPath || null, // will default to userData
      authToken: options.authToken || null,
    };
    this.db = null;
    this.isInitialized = false;
    this.isSyncing = false;
    this.isOnline = false;
    this.syncTimer = null;
    this.syncStats = {
      lastSyncAt: null,
      lastPushAt: null,
      lastPullAt: null,
      totalPushCount: 0,
      totalPullCount: 0,
      pendingQueueItems: 0,
    };
  }

  // ================================================================
  // Initialization
  // ================================================================

  async init() {
    if (this.isInitialized) return;

    try {
      const dbPath = this._getDbPath();
      this.db = new Database(dbPath);

      // Enable WAL mode for better concurrent read performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Create all tables
      this.db.exec(SCHEMA_SQL);

      // Initialize or update sync_meta
      this._initSyncMeta();

      // Load sync stats
      this._loadSyncStats();

      this.isInitialized = true;
      this.emit('initialized', { dbPath });
      console.log('[SyncEngine] Initialized successfully at', dbPath);
    } catch (err) {
      console.error('[SyncEngine] Initialization failed:', err.message);
      this.emit('error', { message: 'Initialization failed', error: err.message });
      throw err;
    }
  }

  _getDbPath() {
    if (this.options.dbPath) return this.options.dbPath;
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, DB_FILE_NAME);
  }

  _initSyncMeta() {
    const meta = this.db.prepare('SELECT * FROM sync_meta WHERE id = 1').get();
    if (!meta) {
      this.db.prepare(
        'INSERT INTO sync_meta (id, deviceId, syncStatus) VALUES (1, ?, ?)'
      ).run(this.options.deviceId, 'idle');
    } else if (meta.deviceId !== this.options.deviceId) {
      this.db.prepare('UPDATE sync_meta SET deviceId = ? WHERE id = 1').run(
        this.options.deviceId
      );
    }
  }

  _loadSyncStats() {
    const meta = this.db.prepare('SELECT * FROM sync_meta WHERE id = 1').get();
    if (meta) {
      this.syncStats.lastSyncAt = meta.lastSyncAt;
      this.syncStats.lastPushAt = meta.lastPushAt;
      this.syncStats.lastPullAt = meta.lastPullAt;
      this.syncStats.totalPushCount = meta.totalPushCount || 0;
      this.syncStats.totalPullCount = meta.totalPullCount || 0;
    }

    const queueCount = this.db.prepare(
      'SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0'
    ).get();
    this.syncStats.pendingQueueItems = queueCount ? queueCount.cnt : 0;
  }

  // ================================================================
  // Sync Status
  // ================================================================

  async getLastSyncTimestamp() {
    if (!this.db) return null;
    const meta = this.db.prepare('SELECT lastSyncAt FROM sync_meta WHERE id = 1').get();
    return meta ? meta.lastSyncAt : null;
  }

  async getStatus() {
    if (!this.db) {
      return {
        initialized: false,
        isSyncing: this.isSyncing,
        isOnline: this.isOnline,
        syncStats: this.syncStats,
      };
    }

    // Refresh pending count
    const queueCount = this.db.prepare(
      'SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0'
    ).get();
    this.syncStats.pendingQueueItems = queueCount ? queueCount.cnt : 0;

    return {
      initialized: this.isInitialized,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      syncStats: { ...this.syncStats },
      deviceId: this.options.deviceId,
    };
  }

  setOnlineStatus(online) {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (online && !wasOnline) {
      this.emit('online');
      // When coming back online, trigger a sync after a short delay
      if (!this.isSyncing) {
        setTimeout(() => {
          if (this.isOnline && !this.isSyncing && this.isInitialized) {
            this.fullSync().catch(() => {});
          }
        }, 2000);
      }
    } else if (!online && wasOnline) {
      this.emit('offline');
    }
  }

  // ================================================================
  // Auto-Sync Timer
  // ================================================================

  startAutoSync(intervalMs) {
    this.stopAutoSync();
    const interval = intervalMs || SYNC_INTERVAL_MS;
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.isInitialized) {
        this.fullSync().catch(() => {});
      }
    }, interval);
    console.log(`[SyncEngine] Auto-sync started (every ${interval / 1000}s)`);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ================================================================
  // Full Sync (Push then Pull)
  // ================================================================

  async fullSync() {
    if (!this.isInitialized || this.isSyncing) {
      if (this.isSyncing) {
        this.emit('sync-progress', { phase: 'push', message: 'Sync already in progress' });
      }
      return { status: this.isSyncing ? 'already-syncing' : 'not-initialized' };
    }

    if (!this.isOnline) {
      this.emit('sync-error', { message: 'Cannot sync while offline' });
      return { status: 'offline' };
    }

    this.isSyncing = true;
    this._updateSyncStatus('syncing');
    this.emit('sync-start', { timestamp: new Date().toISOString() });

    try {
      // Phase 1: Push local changes to server
      this.emit('sync-progress', {
        phase: 'push',
        message: 'Pushing local changes to server...',
        progress: 0,
      });

      const pushResult = await this.pushToServer();
      this.emit('sync-progress', {
        phase: 'push',
        message: `Pushed ${JSON.stringify(pushResult.pushed)} records`,
        progress: 40,
      });

      // Phase 2: Pull server data to local
      this.emit('sync-progress', {
        phase: 'pull',
        message: 'Pulling latest data from server...',
        progress: 50,
      });

      const pullResult = await this.pullFromServer();
      this.emit('sync-progress', {
        phase: 'pull',
        message: `Pulled ${JSON.stringify(pullResult.pulled)} records`,
        progress: 90,
      });

      // Update sync meta
      const now = new Date().toISOString();
      const meta = this.db.prepare('SELECT * FROM sync_meta WHERE id = 1').get();
      const newPushCount = (meta.totalPushCount || 0) + countRecords(pushResult.pushed);
      const newPullCount = (meta.totalPullCount || 0) + countRecords(pullResult.pulled);

      this.db.prepare(
        `UPDATE sync_meta SET
          lastSyncAt = ?,
          serverTimestamp = ?,
          lastPushAt = ?,
          lastPullAt = ?,
          syncStatus = 'completed',
          totalPushCount = ?,
          totalPullCount = ?
        WHERE id = 1`
      ).run(
        now,
        pullResult.syncTimestamp || now,
        now,
        now,
        newPushCount,
        newPullCount
      );

      this._loadSyncStats();
      this._updateSyncStatus('completed');

      this.emit('sync-complete', {
        timestamp: now,
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pullResult.conflicts || [],
      });

      return {
        status: 'success',
        timestamp: now,
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pullResult.conflicts || [],
      };
    } catch (err) {
      this._updateSyncStatus('error');
      this.emit('sync-error', {
        message: err.message,
        phase: err.phase || 'unknown',
      });
      return {
        status: 'error',
        message: err.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  _updateSyncStatus(status) {
    if (this.db) {
      this.db.prepare('UPDATE sync_meta SET syncStatus = ? WHERE id = 1').run(status);
    }
  }

  // ================================================================
  // Push: Read local changes → POST to server
  // ================================================================

  async pushToServer() {
    // Collect unsynced records from all pending tables
    const sales = this.db
      .prepare('SELECT * FROM local_sales WHERE synced = 0')
      .all()
      .map(stripSyncedField);

    const saleItems = this.db
      .prepare('SELECT * FROM local_sale_items WHERE synced = 0')
      .all()
      .map(stripSyncedField);

    const payments = this.db
      .prepare('SELECT * FROM local_payments WHERE synced = 0')
      .all()
      .map(stripSyncedField);

    const customers = this.db
      .prepare('SELECT * FROM local_customers WHERE synced = 0')
      .all()
      .map(stripSyncedField);

    const returns = this.db
      .prepare('SELECT * FROM local_returns WHERE synced = 0')
      .all()
      .map(stripSyncedField);

    const returnItems = this.db
      .prepare('SELECT * FROM local_return_items')
      .all();

    const lastSyncAt = await this.getLastSyncTimestamp();

    const payload = {
      lastSyncAt,
      clientData: {
        sales,
        saleItems,
        payments,
        customers,
        returns,
        returnItems,
      },
      deviceInfo: {
        deviceId: this.options.deviceId,
        appName: this.options.appName,
        appVersion: this.options.appVersion,
      },
    };

    // POST to server
    const url = `${this.options.apiBase}/api/sync`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.options.authToken) {
      headers['Authorization'] = `Bearer ${this.options.authToken}`;
    }

    const err = new Error('Push failed');
    err.phase = 'push';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Mark pushed records as synced
        this._markRecordsSynced('local_sales', sales);
        this._markRecordsSynced('local_sale_items', saleItems);
        this._markRecordsSynced('local_payments', payments);
        this._markRecordsSynced('local_customers', customers);
        this._markRecordsSynced('local_returns', returns);

        // Clear sync queue for pushed items
        this._clearSyncQueue();

        return result;
      } else {
        throw new Error(result.error || 'Server returned unsuccessful sync');
      }
    } catch (err2) {
      err.message = err2.message || err.message;
      throw err;
    }
  }

  _markRecordsSynced(tableName, records) {
    if (!records || records.length === 0) return;
    const stmt = this.db.prepare(`UPDATE ${tableName} SET synced = 1 WHERE id = ?`);
    const batch = this.db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.id);
      }
    });
    batch(records);
  }

  _clearSyncQueue() {
    this.db.prepare('DELETE FROM sync_queue WHERE synced = 0').run();
  }

  // ================================================================
  // Pull: GET from server → Upsert into local SQLite
  // ================================================================

  async pullFromServer() {
    const lastSyncAt = await this.getLastSyncTimestamp();

    const url = `${this.options.apiBase}/api/sync`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.options.authToken) {
      headers['Authorization'] = `Bearer ${this.options.authToken}`;
    }

    const payload = {
      lastSyncAt,
      clientData: {}, // empty push — we just want to pull
      deviceInfo: {
        deviceId: this.options.deviceId,
        appName: this.options.appName,
        appVersion: this.options.appVersion,
      },
    };

    const err = new Error('Pull failed');
    err.phase = 'pull';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server returned unsuccessful sync');
      }

      const serverData = result.serverData;

      // Upsert reference data (server wins — full replace for caches)
      if (serverData.medicines && serverData.medicines.length > 0) {
        this._bulkReplace('local_medicines', serverData.medicines);
      }
      if (serverData.medicineBatches && serverData.medicineBatches.length > 0) {
        this._bulkReplace('local_batches', serverData.medicineBatches);
      }
      if (serverData.suppliers && serverData.suppliers.length > 0) {
        this._bulkReplace('local_suppliers', serverData.suppliers);
      }
      if (serverData.settings && serverData.settings.length > 0) {
        this._bulkReplace('local_settings', serverData.settings);
      }
      if (serverData.purchases && serverData.purchases.length > 0) {
        this._bulkReplace('local_purchases', serverData.purchases);
      }

      // Upsert customers (merge — server wins for existing, add new)
      if (serverData.customers && serverData.customers.length > 0) {
        this._bulkUpsert('local_customers', serverData.customers);
      }

      // Upsert sales (merge — add new ones, keep existing local ones that are unsynced)
      if (serverData.sales && serverData.sales.length > 0) {
        this._bulkUpsertSales(serverData.sales);
      }

      // Upsert sale items
      if (serverData.saleItems && serverData.saleItems.length > 0) {
        this._bulkUpsert('local_sale_items', serverData.saleItems);
      }

      return {
        syncTimestamp: result.syncTimestamp,
        pulled: result.syncReport.pulled,
        conflicts: result.syncReport.conflicts || [],
      };
    } catch (err2) {
      err.message = err2.message || err.message;
      throw err;
    }
  }

  _bulkReplace(tableName, records) {
    if (!records || records.length === 0) return;

    // Get column info from first record
    const columns = Object.keys(records[0]);

    // Build insert or replace statement
    const placeholders = columns.map(() => '?').join(', ');
    const columnList = columns.join(', ');
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders})`
    );

    const batch = this.db.transaction((items) => {
      for (const item of items) {
        const values = columns.map((col) => item[col] ?? null);
        stmt.run(...values);
      }
    });

    batch(records);
  }

  _bulkUpsert(tableName, records) {
    if (!records || records.length === 0) return;

    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const columnList = columns.join(', ');
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders})`
    );

    const batch = this.db.transaction((items) => {
      for (const item of items) {
        const values = columns.map((col) => item[col] ?? null);
        stmt.run(...values);
      }
    });

    batch(records);
  }

  _bulkUpsertSales(records) {
    if (!records || records.length === 0) return;

    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const columnList = columns.join(', ');

    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO local_sales (${columnList}) VALUES (${placeholders})`
    );

    const batch = this.db.transaction((items) => {
      for (const item of items) {
        const values = columns.map((col) => item[col] ?? null);
        stmt.run(...values);
      }
    });

    batch(records);
  }

  // ================================================================
  // Local DB Operations (for offline use)
  // ================================================================

  async createSale(saleData) {
    if (!this.db) throw new Error('SyncEngine not initialized');

    const id = saleData.id || generateCuid();
    const now = new Date().toISOString();
    const invoiceNo = saleData.invoiceNo || `OFFLINE-${Date.now()}`;

    const saleRecord = {
      id,
      invoiceNo,
      customerId: saleData.customerId || null,
      customerName: saleData.customerName || null,
      doctorId: saleData.doctorId || null,
      prescriptionId: saleData.prescriptionId || null,
      date: saleData.date || now,
      subtotal: saleData.subtotal || 0,
      totalDiscount: saleData.totalDiscount || 0,
      cgst: saleData.cgst || 0,
      sgst: saleData.sgst || 0,
      igst: saleData.igst || 0,
      totalGst: saleData.totalGst || 0,
      grandTotal: saleData.grandTotal || 0,
      paidAmount: saleData.paidAmount || 0,
      balanceDue: saleData.balanceDue || 0,
      paymentMode: saleData.paymentMode || 'Cash',
      notes: saleData.notes || null,
      loyaltyPointsUsed: saleData.loyaltyPointsUsed || 0,
      loyaltyPointsEarned: saleData.loyaltyPointsEarned || 0,
      userId: saleData.userId || null,
      counterShiftId: saleData.counterShiftId || null,
      counterId: saleData.counterId || null,
      status: saleData.status || 'Completed',
      synced: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Insert sale
    const columns = Object.keys(saleRecord);
    const placeholders = columns.map(() => '?').join(', ');
    this.db.prepare(
      `INSERT INTO local_sales (${columns.join(', ')}) VALUES (${placeholders})`
    ).run(...columns.map((c) => saleRecord[c]));

    // Insert sale items
    if (saleData.items && saleData.items.length > 0) {
      const insertItem = this.db.prepare(`
        INSERT INTO local_sale_items (id, saleId, medicineId, batchId, medicineName, batchNo, quantity, unitType, saleRate, mrp, gstPercent, cgst, sgst, igst, discount, total, expiryDate, createdAt, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const batchInsert = this.db.transaction((items) => {
        for (const item of items) {
          const itemId = item.id || generateCuid();
          insertItem.run(
            itemId,
            id,
            item.medicineId,
            item.batchId || null,
            item.medicineName || null,
            item.batchNo || null,
            item.quantity || 0,
            item.unitType || 'strip',
            item.saleRate || 0,
            item.mrp || 0,
            item.gstPercent || 12,
            item.cgst || 0,
            item.sgst || 0,
            item.igst || 0,
            item.discount || 0,
            item.total || 0,
            item.expiryDate || null,
            now
          );

          // Decrement local stock if batch is provided
          if (item.batchId && item.quantity) {
            this._decrementLocalStock(item.batchId, item.quantity);
          }
        }
      });

      batchInsert(saleData.items);
    }

    // Insert payment if provided
    if (saleData.payments && saleData.payments.length > 0) {
      const insertPayment = this.db.prepare(`
        INSERT INTO local_payments (id, customerId, saleId, amount, mode, reference, notes, createdAt, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const batchInsert = this.db.transaction((items) => {
        for (const pmt of items) {
          const pmtId = pmt.id || generateCuid();
          insertPayment.run(
            pmtId,
            saleData.customerId || null,
            id,
            pmt.amount || 0,
            pmt.mode || 'Cash',
            pmt.reference || null,
            pmt.notes || null,
            now
          );
        }
      });

      batchInsert(saleData.payments);
    }

    // Add to sync queue
    this._addToSyncQueue('local_sales', 'INSERT', id, saleRecord);

    return { ...saleRecord, items: saleData.items || [] };
  }

  async createCustomer(customerData) {
    if (!this.db) throw new Error('SyncEngine not initialized');

    const id = customerData.id || generateCuid();
    const now = new Date().toISOString();

    const record = {
      id,
      name: customerData.name,
      phone: customerData.phone || null,
      email: customerData.email || null,
      address: customerData.address || null,
      doctorName: customerData.doctorName || null,
      balance: customerData.balance || 0,
      totalPurchases: customerData.totalPurchases || 0,
      loyaltyPoints: customerData.loyaltyPoints || 0,
      creditLimit: customerData.creditLimit || 0,
      active: customerData.active !== undefined ? (customerData.active ? 1 : 0) : 1,
      createdAt: now,
      updatedAt: now,
      synced: 0,
    };

    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    this.db.prepare(
      `INSERT INTO local_customers (${columns.join(', ')}) VALUES (${placeholders})`
    ).run(...columns.map((c) => record[c]));

    this._addToSyncQueue('local_customers', 'INSERT', id, record);

    return record;
  }

  _decrementLocalStock(batchId, quantity) {
    try {
      this.db.prepare(
        'UPDATE local_batches SET stockQty = MAX(0, stockQty - ?), updatedAt = ? WHERE id = ?'
      ).run(quantity, new Date().toISOString(), batchId);
    } catch (err) {
      console.warn('[SyncEngine] Failed to decrement local stock:', err.message);
    }
  }

  // ================================================================
  // Read operations from local SQLite
  // ================================================================

  getMedicines(searchTerm) {
    if (!this.db) return [];
    if (searchTerm) {
      return this.db
        .prepare(
          "SELECT * FROM local_medicines WHERE name LIKE ? OR barcode LIKE ? OR genericName LIKE ? AND active = 1 ORDER BY name ASC"
        )
        .all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    return this.db.prepare('SELECT * FROM local_medicines WHERE active = 1 ORDER BY name ASC').all();
  }

  getMedicineBatches(medicineId) {
    if (!this.db) return [];
    if (medicineId) {
      return this.db
        .prepare('SELECT * FROM local_batches WHERE medicineId = ? AND active = 1 ORDER BY expiryDate ASC')
        .all(medicineId);
    }
    return this.db.prepare('SELECT * FROM local_batches WHERE active = 1 ORDER BY expiryDate ASC').all();
  }

  getCustomers(searchTerm) {
    if (!this.db) return [];
    if (searchTerm) {
      return this.db
        .prepare(
          "SELECT * FROM local_customers WHERE name LIKE ? OR phone LIKE ? AND active = 1 ORDER BY name ASC"
        )
        .all(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    return this.db.prepare('SELECT * FROM local_customers WHERE active = 1 ORDER BY name ASC').all();
  }

  getSuppliers() {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM local_suppliers WHERE active = 1 ORDER BY name ASC').all();
  }

  getSettings() {
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT * FROM local_settings ORDER BY key ASC').all();
    // Convert to key-value map
    const map = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  getSales(options = {}) {
    if (!this.db) return [];
    let query = 'SELECT * FROM local_sales';
    const params = [];
    const conditions = [];

    if (options.synced !== undefined) {
      conditions.push('synced = ?');
      params.push(options.synced ? 1 : 0);
    }
    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    if (options.customerId) {
      conditions.push('customerId = ?');
      params.push(options.customerId);
    }
    if (options.fromDate) {
      conditions.push('date >= ?');
      params.push(options.fromDate);
    }
    if (options.toDate) {
      conditions.push('date <= ?');
      params.push(options.toDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date DESC, createdAt DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  getSalesWithItems(saleId) {
    if (!this.db) return null;
    const sale = this.db.prepare('SELECT * FROM local_sales WHERE id = ?').get(saleId);
    if (!sale) return null;

    const items = this.db
      .prepare('SELECT * FROM local_sale_items WHERE saleId = ?')
      .all(saleId);

    const payments = this.db
      .prepare('SELECT * FROM local_payments WHERE saleId = ?')
      .all(saleId);

    return { ...sale, items, payments };
  }

  getPurchases() {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM local_purchases ORDER BY date DESC').all();
  }

  // ================================================================
  // Sync Queue Management
  // ================================================================

  _addToSyncQueue(tableName, operation, recordId, data) {
    try {
      this.db.prepare(
        'INSERT INTO sync_queue (table_name, operation, record_id, data_json) VALUES (?, ?, ?, ?)'
      ).run(tableName, operation, recordId, JSON.stringify(data));
    } catch (err) {
      console.warn('[SyncEngine] Failed to add to sync queue:', err.message);
    }
  }

  getPendingQueueItems() {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC').all();
  }

  // ================================================================
  // Cleanup / Close
  // ================================================================

  async close() {
    this.stopAutoSync();
    if (this.db) {
      try {
        this.db.pragma('journal_mode = DELETE');
        this.db.close();
      } catch (err) {
        console.warn('[SyncEngine] Error closing database:', err.message);
      }
      this.db = null;
    }
    this.isInitialized = false;
    this.emit('closed');
  }
}

// ================================================================
// Utility Functions
// ================================================================

function getMachineId() {
  try {
    const os = require('os');
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const hash = crypto
      .createHash('sha256')
      .update(`${hostname}-${platform}-${arch}`)
      .digest('hex')
      .substring(0, 8);
    return `${platform}-${hash}`;
  } catch {
    return `desktop-${Date.now()}`;
  }
}

function generateCuid() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const counter = (Math.random() * 36 | 0).toString(36);
  return `c${timestamp}${random}${counter}`;
}

function stripSyncedField(record) {
  if (!record) return record;
  const { synced, ...rest } = record;
  return rest;
}

function countRecords(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
}

// ================================================================
// Exports
// ================================================================
module.exports = { SyncEngine };
