// ================================================================
// uPharma Sync Engine — Offline-First Sync for Electron
// Manages local SQLite database and bidirectional sync with cloud.
// Enterprise-grade with conflict handling, retry logic, and audit logs.
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
  'local_audit_logs',
];
const MAX_RETRIES = 5;
const RETRY_BACKOFF_BASE_MS = 10000; // 10 seconds base, doubles each retry
const FETCH_TIMEOUT_MS = 30000; // 30 seconds

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
    totalPullCount INTEGER NOT NULL DEFAULT 0,
    terminal_code TEXT DEFAULT 'T01'
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
    scheduleType TEXT DEFAULT 'OTC',
    narcoticRegisterNo TEXT,
    minAlertQty INTEGER DEFAULT 5,
    maxAlertQty INTEGER DEFAULT 500,
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Cached batches from server
  -- Includes version for conflict detection and stockOvercommitted flag
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
    stockOvercommitted INTEGER DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
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

  -- Sync queue: tracks pending changes to push with retry support
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TEXT,
    next_retry_at TEXT,
    sync_batch_id TEXT,
    checksum TEXT
  );

  -- Enterprise invoice sequences (STORECODE-TERM-YYYYMMDD-SEQ pattern)
  CREATE TABLE IF NOT EXISTS local_invoice_sequences (
    date TEXT NOT NULL,
    counter TEXT NOT NULL DEFAULT 'MAIN',
    terminal_code TEXT NOT NULL DEFAULT 'T01',
    lastSequence INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, counter, terminal_code)
  );

  -- Stock conflict log for admin review
  CREATE TABLE IF NOT EXISTS local_stock_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batchId TEXT NOT NULL,
    medicineId TEXT NOT NULL,
    localStockAtSale INTEGER NOT NULL,
    soldQuantity INTEGER NOT NULL,
    serverStockAtSync INTEGER,
    conflictType TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Local users for offline authentication
  CREATE TABLE IF NOT EXISTS local_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Cashier',
    pin TEXT,
    pin_hash TEXT,
    pin_salt TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  );

  -- Local audit logs
  CREATE TABLE IF NOT EXISTS local_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT,
    details TEXT,
    timestamp TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_local_sales_synced ON local_sales(synced);
  CREATE INDEX IF NOT EXISTS idx_local_sale_items_saleId ON local_sale_items(saleId);
  CREATE INDEX IF NOT EXISTS idx_local_payments_synced ON local_payments(synced);
  CREATE INDEX IF NOT EXISTS idx_local_customers_synced ON local_customers(synced);
  CREATE INDEX IF NOT EXISTS idx_local_returns_synced ON local_returns(synced);
  CREATE INDEX IF NOT EXISTS idx_local_batches_medicineId ON local_batches(medicineId);
  CREATE INDEX IF NOT EXISTS idx_local_batches_expiry ON local_batches(expiryDate);
  CREATE INDEX IF NOT EXISTS idx_local_medicines_name ON local_medicines(name);
  CREATE INDEX IF NOT EXISTS idx_local_medicines_barcode ON local_medicines(barcode);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_retry ON sync_queue(synced, retry_count, next_retry_at);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_batch ON sync_queue(sync_batch_id);
  CREATE INDEX IF NOT EXISTS idx_stock_conflicts_resolved ON local_stock_conflicts(resolved);
  CREATE INDEX IF NOT EXISTS idx_local_audit_logs_synced ON local_audit_logs(synced);
  CREATE INDEX IF NOT EXISTS idx_local_audit_logs_timestamp ON local_audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_local_users_username ON local_users(username);
  CREATE INDEX IF NOT EXISTS idx_local_invoice_sequences_date ON local_invoice_sequences(date);
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
      syncApiKey: options.syncApiKey || 'upharma-sync-2026',
      terminalCode: options.terminalCode || 'T01',
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

      // Migrate schema for existing databases (add new columns to old tables)
      this._migrateSchema();

      // Initialize or update sync_meta
      this._initSyncMeta();

      // Load sync stats
      this._loadSyncStats();

      // Recover from potential crash during sync
      this._recoverFromCrash();

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

  /**
   * Migrate schema: add new columns to existing tables.
   * This is needed because CREATE TABLE IF NOT EXISTS won't add columns
   * to tables that already exist.
   */
  _migrateSchema() {
    // --- local_batches columns ---
    // Add stockOvercommitted to local_batches if missing
    try {
      this.db.exec('ALTER TABLE local_batches ADD COLUMN stockOvercommitted INTEGER DEFAULT 0');
    } catch (e) {
      // Column already exists — safe to ignore
    }

    // Add version to local_batches if missing
    try {
      this.db.exec('ALTER TABLE local_batches ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
    } catch (e) {
      // Column already exists — safe to ignore
    }

    // --- sync_queue columns ---
    // Add retry_count if missing
    try {
      this.db.exec('ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0');
    } catch (e) {
      // Column already exists
    }
    // Add last_retry_at if missing
    try {
      this.db.exec('ALTER TABLE sync_queue ADD COLUMN last_retry_at TEXT');
    } catch (e) {
      // Column already exists
    }
    // Add next_retry_at if missing
    try {
      this.db.exec('ALTER TABLE sync_queue ADD COLUMN next_retry_at TEXT');
    } catch (e) {
      // Column already exists
    }
    // Add sync_batch_id if missing
    try {
      this.db.exec('ALTER TABLE sync_queue ADD COLUMN sync_batch_id TEXT');
    } catch (e) {
      // Column already exists
    }
    // Add checksum if missing
    try {
      this.db.exec('ALTER TABLE sync_queue ADD COLUMN checksum TEXT');
    } catch (e) {
      // Column already exists
    }

    // Create index on sync_batch_id for existing DBs
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_batch ON sync_queue(sync_batch_id)');
    } catch (e) {
      // Index creation failed — safe to ignore
    }

    // --- local_stock_conflicts: add synced column ---
    try {
      this.db.exec('ALTER TABLE local_stock_conflicts ADD COLUMN synced INTEGER NOT NULL DEFAULT 0');
    } catch (e) {
      // Column already exists — safe to ignore
    }

    // --- local_users: add pin_hash and pin_salt ---
    try {
      this.db.exec('ALTER TABLE local_users ADD COLUMN pin_hash TEXT');
    } catch (e) {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE local_users ADD COLUMN pin_salt TEXT');
    } catch (e) {
      // Column already exists
    }

    // --- local_medicines: add pharmacy-specific fields ---
    try {
      this.db.exec('ALTER TABLE local_medicines ADD COLUMN scheduleType TEXT DEFAULT \'OTC\'');
    } catch (e) {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE local_medicines ADD COLUMN narcoticRegisterNo TEXT');
    } catch (e) {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE local_medicines ADD COLUMN minAlertQty INTEGER DEFAULT 5');
    } catch (e) {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE local_medicines ADD COLUMN maxAlertQty INTEGER DEFAULT 500');
    } catch (e) {
      // Column already exists
    }

    // --- sync_meta: add terminal_code ---
    try {
      this.db.exec('ALTER TABLE sync_meta ADD COLUMN terminal_code TEXT DEFAULT \'T01\'');
    } catch (e) {
      // Column already exists
    }

    // --- local_invoice_sequences: add terminal_code column ---
    // For existing DBs without terminal_code, we need to recreate the table
    // since SQLite doesn't support altering PRIMARY KEY constraints.
    // We handle this gracefully: the new schema uses the new PK, and the
    // old data still works via INSERT OR REPLACE.
    try {
      this.db.exec('ALTER TABLE local_invoice_sequences ADD COLUMN terminal_code TEXT NOT NULL DEFAULT \'T01\'');
    } catch (e) {
      // Column already exists
    }

    // --- Create expiry index on local_batches ---
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_local_batches_expiry ON local_batches(expiryDate)');
    } catch (e) {
      // Index creation failed — safe to ignore
    }

    // --- Migrate existing plain-text PINs to scrypt hashed format ---
    this._migratePlainPinsToHashed();
  }

  /**
   * Migrate existing users with plain-text PINs to scrypt hashed format.
   * For each user that has a plain `pin` but no `pin_hash`, generate hash+salt.
   */
  _migratePlainPinsToHashed() {
    if (!this.db) return;

    try {
      const usersWithPlainPin = this.db.prepare(
        'SELECT id, pin FROM local_users WHERE pin IS NOT NULL AND pin != \'\' AND pin_hash IS NULL'
      ).all();

      if (usersWithPlainPin.length === 0) return;

      console.log(`[SyncEngine] Migrating ${usersWithPlainPin.length} plain-text PINs to scrypt hashed format`);

      const updateStmt = this.db.prepare(
        'UPDATE local_users SET pin_hash = ?, pin_salt = ?, pin = NULL WHERE id = ?'
      );

      const migrateBatch = this.db.transaction((users) => {
        for (const user of users) {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = this._hashPin(user.pin, salt);
          updateStmt.run(hash, salt, user.id);
        }
      });

      migrateBatch(usersWithPlainPin);
      console.log('[SyncEngine] PIN migration completed successfully');
    } catch (err) {
      console.warn('[SyncEngine] PIN migration failed:', err.message);
    }
  }

  /**
   * Recover from crash: if the app was killed during a sync operation,
   * reset the sync status so it can be retried. Do NOT clear the queue —
   * items will be retried on the next sync cycle.
   */
  _recoverFromCrash() {
    if (!this.db) return;

    try {
      const meta = this.db.prepare('SELECT * FROM sync_meta WHERE id = 1').get();
      if (meta && meta.syncStatus === 'syncing') {
        console.warn('[SyncEngine] Crash recovery: sync was in progress, resetting status');
        this.db.prepare("UPDATE sync_meta SET syncStatus = 'error' WHERE id = 1").run();
        // Do NOT clear the queue — items will be retried
      }

      // Verify database integrity
      const integrityResult = this.db.pragma('integrity_check');
      if (integrityResult && integrityResult[0] && integrityResult[0].integrity_check !== 'ok') {
        console.error('[SyncEngine] Database integrity check failed:', integrityResult[0].integrity_check);
        // Attempt recovery with checkpoint
        try {
          this.db.pragma('wal_checkpoint(TRUNCATE)');
          console.log('[SyncEngine] Attempted WAL checkpoint recovery');
        } catch (checkpointErr) {
          console.error('[SyncEngine] WAL checkpoint recovery failed:', checkpointErr.message);
        }
      }
    } catch (err) {
      console.error('[SyncEngine] Crash recovery error:', err.message);
    }
  }

  _initSyncMeta() {
    const meta = this.db.prepare('SELECT * FROM sync_meta WHERE id = 1').get();
    if (!meta) {
      this.db.prepare(
        'INSERT INTO sync_meta (id, deviceId, syncStatus, terminal_code) VALUES (1, ?, ?, ?)'
      ).run(this.options.deviceId, 'idle', this.options.terminalCode);
    } else {
      // Update deviceId and terminal code if changed
      this.db.prepare(
        'UPDATE sync_meta SET deviceId = ?, terminal_code = ? WHERE id = 1'
      ).run(this.options.deviceId, this.options.terminalCode);
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
  // Full Sync (Push then Pull — consolidated single call)
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
      // Phase 1: Push local changes to server (server returns pull data in response)
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

      // Phase 2: Process pull data from the push response (no extra API call)
      this.emit('sync-progress', {
        phase: 'pull',
        message: 'Processing server data...',
        progress: 50,
      });

      let pullResult;
      if (pushResult.serverData) {
        // Server returned pull data in the push response — process locally
        pullResult = this._processPullData(pushResult);
      } else {
        // Fallback: make a separate pull call if server didn't return data
        pullResult = await this.pullFromServer();
      }

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
  // Uses selective queue clearing and retry logic for reliability.
  // Includes AbortController timeout for fetch.
  // ================================================================

  async pushToServer() {
    // Collect unsynced queue items eligible for retry
    const pendingItems = this.db.prepare(
      'SELECT * FROM sync_queue WHERE synced = 0 AND (next_retry_at IS NULL OR next_retry_at <= ?) AND retry_count < ? ORDER BY created_at ASC'
    ).all(new Date().toISOString(), MAX_RETRIES);

    // If nothing to push, still make a lightweight call to get pull data
    const hasData = pendingItems.length > 0;

    // Collect unsynced records from all pending tables
    const sales = hasData ? this.db
      .prepare('SELECT * FROM local_sales WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

    const saleItems = hasData ? this.db
      .prepare('SELECT * FROM local_sale_items WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

    const payments = hasData ? this.db
      .prepare('SELECT * FROM local_payments WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

    const customers = hasData ? this.db
      .prepare('SELECT * FROM local_customers WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

    const returns = hasData ? this.db
      .prepare('SELECT * FROM local_returns WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

    const returnItems = hasData ? this.db
      .prepare('SELECT * FROM local_return_items')
      .all() : [];

    // Include stock conflicts in the push payload
    const stockConflicts = hasData ? this.db
      .prepare('SELECT * FROM local_stock_conflicts WHERE synced = 0')
      .all() : [];

    // Include unsynced audit logs in the push payload
    const auditLogs = hasData ? this.db
      .prepare('SELECT * FROM local_audit_logs WHERE synced = 0')
      .all()
      .map(stripSyncedField) : [];

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
        stockConflicts,
        auditLogs,
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
    // Fix 5: API key authentication
    if (this.options.syncApiKey) {
      headers['x-sync-api-key'] = this.options.syncApiKey;
    }

    const err = new Error('Push failed');
    err.phase = 'push';

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Mark pushed records as synced in their respective tables
        this._markRecordsSynced('local_sales', sales);
        this._markRecordsSynced('local_sale_items', saleItems);
        this._markRecordsSynced('local_payments', payments);
        this._markRecordsSynced('local_customers', customers);
        this._markRecordsSynced('local_returns', returns);
        this._markRecordsSynced('local_audit_logs', auditLogs);

        // Mark pushed stock conflicts as synced
        if (stockConflicts.length > 0) {
          const conflictIds = stockConflicts.map(c => c.id);
          this.db.prepare(
            `UPDATE local_stock_conflicts SET synced = 1 WHERE id IN (${conflictIds.map(() => '?').join(',')})`
          ).run(...conflictIds);
        }

        // Selectively mark only the successfully pushed queue items as synced
        this._markQueueItemsSynced(pendingItems.map(item => item.id));

        return result;
      } else {
        throw new Error(result.error || 'Server returned unsuccessful sync');
      }
    } catch (err2) {
      if (err2.name === 'AbortError') {
        const timeoutErr = new Error(`Push timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
        timeoutErr.phase = 'push';
        this._handlePushFailure(pendingItems, timeoutErr);
        throw timeoutErr;
      }
      // On failure: increment retry_count and set next_retry_at for all pending items
      this._handlePushFailure(pendingItems, err2);
      err.message = err2.message || err.message;
      throw err;
    }
  }

  /**
   * Process pull data locally from a server response object.
   * Used when the server returns pull data in the push response,
   * avoiding a separate API call.
   */
  _processPullData(serverResult) {
    if (!serverResult || !serverResult.serverData) {
      return { syncTimestamp: null, pulled: {}, conflicts: [] };
    }

    const serverData = serverResult.serverData;

    // Upsert reference data (server wins — full replace for caches)
    if (serverData.medicines && serverData.medicines.length > 0) {
      this._bulkUpsert('local_medicines', serverData.medicines);
    }
    // Use _mergeBatches instead of _bulkUpsert to preserve overcommitted stock
    if (serverData.medicineBatches && serverData.medicineBatches.length > 0) {
      this._mergeBatches(serverData.medicineBatches);
    }
    if (serverData.suppliers && serverData.suppliers.length > 0) {
      this._bulkUpsert('local_suppliers', serverData.suppliers);
    }
    if (serverData.settings && serverData.settings.length > 0) {
      this._bulkUpsert('local_settings', serverData.settings);
    }
    if (serverData.purchases && serverData.purchases.length > 0) {
      this._bulkUpsert('local_purchases', serverData.purchases);
    }

    // Cache users from server for offline authentication (Fix 6)
    if (serverData.users && serverData.users.length > 0) {
      this.cacheUsers(serverData.users);
    }

    // Upsert customers (merge — server wins for existing, add new)
    if (serverData.customers && serverData.customers.length > 0) {
      this._bulkUpsert('local_customers', serverData.customers);
    }

    // Upsert sales (merge — add new ones, keep existing local ones that are unsynced)
    if (serverData.sales && serverData.sales.length > 0) {
      this._bulkUpsert('local_sales', serverData.sales);
    }

    // Upsert sale items
    if (serverData.saleItems && serverData.saleItems.length > 0) {
      this._bulkUpsert('local_sale_items', serverData.saleItems);
    }

    // Resolve stock conflicts after pull (Fix 1)
    this.resolveStockConflicts();

    return {
      syncTimestamp: serverResult.syncTimestamp,
      pulled: serverResult.syncReport ? serverResult.syncReport.pulled : {},
      conflicts: serverResult.syncReport ? (serverResult.syncReport.conflicts || []) : [],
    };
  }

  // ================================================================
  // Pull: GET from server → Upsert into local SQLite
  // Accepts optional pre-fetched server result to avoid extra API call.
  // ================================================================

  async pullFromServer(serverResult) {
    // If a server result was passed (from pushToServer), process it locally
    if (serverResult) {
      return this._processPullData(serverResult);
    }

    // Otherwise, make a separate pull call to the server
    const lastSyncAt = await this.getLastSyncTimestamp();

    const url = `${this.options.apiBase}/api/sync`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.options.authToken) {
      headers['Authorization'] = `Bearer ${this.options.authToken}`;
    }
    // Fix 5: API key authentication
    if (this.options.syncApiKey) {
      headers['x-sync-api-key'] = this.options.syncApiKey;
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
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server returned unsuccessful sync');
      }

      return this._processPullData(result);
    } catch (err2) {
      if (err2.name === 'AbortError') {
        const timeoutErr = new Error(`Pull timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
        timeoutErr.phase = 'pull';
        throw timeoutErr;
      }
      err.message = err2.message || err.message;
      throw err;
    }
  }

  /**
   * Bulk upsert: INSERT OR REPLACE for any table.
   * Consolidated from _bulkReplace, _bulkUpsert, and _bulkUpsertSales.
   */
  _bulkUpsert(tableName, records) {
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

  /**
   * Merge server batches into local batches intelligently.
   * - For batches where stockOvercommitted = 1 locally, preserves local stockQty and flags
   * - For normal batches, uses server data
   * - Always preserves stockOvercommitted and version from local if they were modified
   */
  _mergeBatches(serverBatches) {
    if (!serverBatches || serverBatches.length === 0) return;

    const upsertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO local_batches (
        id, medicineId, batchNo, expiryDate, purchaseRate, saleRate, mrp,
        stockQty, initialStock, supplierId, purchaseDate, rackId, active,
        createdAt, updatedAt, stockOvercommitted, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = this.db.transaction((items) => {
      for (const serverBatch of items) {
        // Check if we have a local version with overcommitted stock
        const localBatch = this.db.prepare(
          'SELECT stockQty, stockOvercommitted, version FROM local_batches WHERE id = ?'
        ).get(serverBatch.id);

        if (localBatch && localBatch.stockOvercommitted === 1) {
          // Preserve local stockQty and overcommitted flags, use server data for everything else
          upsertStmt.run(
            serverBatch.id,
            serverBatch.medicineId,
            serverBatch.batchNo,
            serverBatch.expiryDate || null,
            serverBatch.purchaseRate || 0,
            serverBatch.saleRate || 0,
            serverBatch.mrp || 0,
            localBatch.stockQty,  // PRESERVED: local decremented stock
            serverBatch.initialStock || 0,
            serverBatch.supplierId || null,
            serverBatch.purchaseDate || null,
            serverBatch.rackId || null,
            serverBatch.active !== undefined ? (serverBatch.active ? 1 : 0) : 1,
            serverBatch.createdAt || null,
            serverBatch.updatedAt || new Date().toISOString(),
            1,  // PRESERVED: stockOvercommitted flag
            localBatch.version  // PRESERVED: local version (higher due to offline changes)
          );
        } else if (localBatch && localBatch.version > (serverBatch.version || 0)) {
          // Local version is newer — preserve local version but take server stockQty
          upsertStmt.run(
            serverBatch.id,
            serverBatch.medicineId,
            serverBatch.batchNo,
            serverBatch.expiryDate || null,
            serverBatch.purchaseRate || 0,
            serverBatch.saleRate || 0,
            serverBatch.mrp || 0,
            serverBatch.stockQty || 0,
            serverBatch.initialStock || 0,
            serverBatch.supplierId || null,
            serverBatch.purchaseDate || null,
            serverBatch.rackId || null,
            serverBatch.active !== undefined ? (serverBatch.active ? 1 : 0) : 1,
            serverBatch.createdAt || null,
            serverBatch.updatedAt || new Date().toISOString(),
            localBatch.stockOvercommitted || 0,
            localBatch.version  // PRESERVED: local version
          );
        } else {
          // Normal case: use server data entirely
          upsertStmt.run(
            serverBatch.id,
            serverBatch.medicineId,
            serverBatch.batchNo,
            serverBatch.expiryDate || null,
            serverBatch.purchaseRate || 0,
            serverBatch.saleRate || 0,
            serverBatch.mrp || 0,
            serverBatch.stockQty || 0,
            serverBatch.initialStock || 0,
            serverBatch.supplierId || null,
            serverBatch.purchaseDate || null,
            serverBatch.rackId || null,
            serverBatch.active !== undefined ? (serverBatch.active ? 1 : 0) : 1,
            serverBatch.createdAt || null,
            serverBatch.updatedAt || new Date().toISOString(),
            serverBatch.stockOvercommitted || 0,
            serverBatch.version || 1
          );
        }
      }
    });

    batch(serverBatches);
  }

  // ================================================================
  // Stock Conflict Detection & Resolution (Fix 1)
  // ================================================================

  /**
   * Resolve stock conflicts after a pull.
   * Compares local batch versions with the freshly pulled server data.
   * If a batch that was overcommitted locally now has server stock info,
   * creates a conflict record for admin review.
   */
  resolveStockConflicts() {
    if (!this.db) return;

    // Find all overcommitted batches that haven't been conflict-logged yet
    const overcommittedBatches = this.db.prepare(
      'SELECT * FROM local_batches WHERE stockOvercommitted = 1 AND active = 1'
    ).all();

    if (overcommittedBatches.length === 0) return;

    const now = new Date().toISOString();

    const insertConflict = this.db.prepare(`
      INSERT INTO local_stock_conflicts (batchId, medicineId, localStockAtSale, soldQuantity, serverStockAtSync, conflictType, resolved, createdAt)
      VALUES (?, ?, ?, ?, ?, 'overcommit', 0, ?)
    `);

    const batch = this.db.transaction((batches) => {
      for (const batchRow of batches) {
        // Check if we already have an unresolved conflict for this batch
        const existing = this.db.prepare(
          'SELECT id FROM local_stock_conflicts WHERE batchId = ? AND resolved = 0'
        ).get(batchRow.id);

        if (!existing) {
          insertConflict.run(
            batchRow.id,
            batchRow.medicineId,
            batchRow.stockQty || 0,   // current (negative equivalent) stock
            Math.abs(batchRow.stockQty - (batchRow.initialStock || 0)), // approximate sold qty
            batchRow.stockQty || 0,
            now
          );
        }
      }
    });

    batch(overcommittedBatches);
    console.log(`[SyncEngine] Created stock conflict records for ${overcommittedBatches.length} overcommitted batches`);
  }

  /**
   * Get all unresolved stock conflicts for admin review.
   */
  getStockConflicts(includeResolved = false) {
    if (!this.db) return [];
    if (includeResolved) {
      return this.db.prepare('SELECT * FROM local_stock_conflicts ORDER BY createdAt DESC').all();
    }
    return this.db.prepare('SELECT * FROM local_stock_conflicts WHERE resolved = 0 ORDER BY createdAt DESC').all();
  }

  /**
   * Resolve a stock conflict (mark it as reviewed).
   */
  resolveStockConflictById(conflictId, action) {
    if (!this.db) return false;
    this.db.prepare(
      'UPDATE local_stock_conflicts SET resolved = 1 WHERE id = ?'
    ).run(conflictId);

    // Log the resolution in audit log
    const conflict = this.db.prepare('SELECT * FROM local_stock_conflicts WHERE id = ?').get(conflictId);
    if (conflict) {
      this.logAudit('resolve_stock_conflict', 'local_stock_conflicts', conflictId, 'system', {
        conflictType: conflict.conflictType,
        action,
        batchId: conflict.batchId,
      });
    }

    return true;
  }

  // ================================================================
  // Invoice Numbering — Enterprise Pattern with Terminal Code
  // Format: STORECODE-TERM-YYYYMMDD-SEQ
  // Example: UPH-T01-20260601-0001
  // ================================================================

  /**
   * Generate an invoice number in the format: STORECODE-TERM-YYYYMMDD-SEQ
   * Example: UPH-T01-20260601-0001
   * Uses a local sequence table to ensure uniqueness even offline.
   */
  generateInvoiceNo(counterCode) {
    if (!counterCode) counterCode = 'MAIN';
    if (!this.db) throw new Error('SyncEngine not initialized');

    const now = new Date();
    const date = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const terminalCode = this._getTerminalCode();

    const row = this.db.prepare(
      'SELECT lastSequence FROM local_invoice_sequences WHERE date = ? AND counter = ? AND terminal_code = ?'
    ).get(date, counterCode, terminalCode);

    const nextSeq = (row ? row.lastSequence : 0) + 1;

    this.db.prepare(
      'INSERT OR REPLACE INTO local_invoice_sequences (date, counter, terminal_code, lastSequence) VALUES (?, ?, ?, ?)'
    ).run(date, counterCode, terminalCode, nextSeq);

    const storeCode = this._getStoreCode();
    return `${storeCode}-${terminalCode}-${date}-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Get the store code from settings. Defaults to 'UPH'.
   */
  _getStoreCode() {
    if (!this.db) return 'UPH';
    try {
      const row = this.db.prepare(
        "SELECT value FROM local_settings WHERE key = 'storeCode'"
      ).get();
      return (row && row.value) ? row.value : 'UPH';
    } catch (e) {
      return 'UPH';
    }
  }

  /**
   * Get the terminal code. Uses constructor option or falls back to sync_meta.
   */
  _getTerminalCode() {
    if (this.options.terminalCode) return this.options.terminalCode;
    if (!this.db) return 'T01';
    try {
      const row = this.db.prepare(
        "SELECT terminal_code FROM sync_meta WHERE id = 1"
      ).get();
      return (row && row.terminal_code) ? row.terminal_code : 'T01';
    } catch (e) {
      return 'T01';
    }
  }

  // ================================================================
  // PIN Hashing (scrypt) — Security Improvement
  // ================================================================

  /**
   * Hash a PIN using scrypt with the given salt.
   * Returns a hex-encoded 64-byte hash.
   */
  _hashPin(pin, salt) {
    const saltBuffer = Buffer.from(salt, 'hex');
    const hash = crypto.scryptSync(pin, saltBuffer, 64);
    return hash.toString('hex');
  }

  /**
   * Verify a PIN against a stored scrypt hash using timing-safe comparison.
   * Returns true if the PIN matches the hash.
   */
  _verifyPin(pin, storedHash, salt) {
    if (!pin || !storedHash || !salt) return false;
    try {
      const computedHash = this._hashPin(pin, salt);
      const a = Buffer.from(computedHash, 'hex');
      const b = Buffer.from(storedHash, 'hex');
      // Use timingSafeEqual to prevent timing attacks
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch (err) {
      console.warn('[SyncEngine] PIN verification error:', err.message);
      return false;
    }
  }

  // ================================================================
  // Local DB Operations (for offline use)
  // ================================================================

  async createSale(saleData) {
    if (!this.db) throw new Error('SyncEngine not initialized');

    const id = saleData.id || generateCuid();
    const now = new Date().toISOString();
    // Fix 2: Use enterprise invoice numbering instead of OFFLINE-timestamp
    const invoiceNo = saleData.invoiceNo || this.generateInvoiceNo();

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

    // Generate a sync_batch_id for grouping sale + items in sync queue
    const syncBatchId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

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

          // Decrement local stock if batch is provided (Fix 1: enterprise-grade)
          if (item.batchId && item.quantity) {
            this._decrementLocalStock(item.batchId, item.quantity, item.medicineId);
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

    // Add to sync queue with batch ID for grouping
    this._addToSyncQueue('local_sales', 'INSERT', id, saleRecord, syncBatchId);

    // Log sale creation in audit trail
    if (saleData.userId) {
      this.logAudit('create_sale', 'local_sales', id, saleData.userId, {
        invoiceNo,
        grandTotal: saleData.grandTotal,
      });
    }

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

    // Log customer creation in audit trail
    if (customerData.userId) {
      this.logAudit('create_customer', 'local_customers', id, customerData.userId, {
        name: customerData.name,
        phone: customerData.phone,
      });
    }

    return record;
  }

  /**
   * Enterprise-grade stock decrement (Fix 1).
   * - Checks if sufficient stock exists BEFORE decrementing
   * - If stock would go negative, STILL ALLOWS the sale (pharmacy can't refuse a customer)
   * - Marks the batch as stockOvercommitted = 1
   * - Increments the version counter for conflict detection
   * - Creates a stock conflict record for admin review
   */
  _decrementLocalStock(batchId, quantity, medicineId) {
    try {
      const batch = this.db.prepare(
        'SELECT stockQty, version, stockOvercommitted FROM local_batches WHERE id = ?'
      ).get(batchId);

      if (!batch) {
        console.warn(`[SyncEngine] Batch ${batchId} not found for stock decrement`);
        return;
      }

      const currentStock = batch.stockQty || 0;
      const wouldBeNegative = (currentStock - quantity) < 0;
      const newStock = Math.max(0, currentStock - quantity);
      const newVersion = (batch.version || 0) + 1;
      const now = new Date().toISOString();

      if (wouldBeNegative) {
        // Stock is insufficient but we allow the sale (pharmacy must serve customers)
        console.warn(
          `[SyncEngine] Stock overcommit on batch ${batchId}: ` +
          `had ${currentStock}, sold ${quantity}, deficit: ${currentStock - quantity}`
        );

        this.db.prepare(
          'UPDATE local_batches SET stockQty = ?, stockOvercommitted = 1, version = ?, updatedAt = ? WHERE id = ?'
        ).run(newStock, newVersion, now, batchId);

        // Create a stock conflict record for admin review
        this.db.prepare(`
          INSERT INTO local_stock_conflicts (batchId, medicineId, localStockAtSale, soldQuantity, serverStockAtSync, conflictType, resolved, createdAt)
          VALUES (?, ?, ?, ?, ?, 'overcommit', 0, ?)
        `).run(
          batchId,
          medicineId || '',
          currentStock,
          quantity,
          newStock,
          now
        );
      } else {
        // Normal decrement — sufficient stock
        this.db.prepare(
          'UPDATE local_batches SET stockQty = ?, version = ?, updatedAt = ? WHERE id = ?'
        ).run(newStock, newVersion, now, batchId);
      }
    } catch (err) {
      console.warn('[SyncEngine] Failed to decrement local stock:', err.message);
    }
  }

  // ================================================================
  // Offline User Authentication (Fix 5 — username-first + scrypt)
  // ================================================================

  /**
   * Authenticate a user offline using username and PIN.
   * SECURITY: Requires username first (not PIN-only), then verifies PIN.
   * Supports both scrypt-hashed PINs and legacy plain-text PINs.
   * Returns the user record (without sensitive fields) if found and active, null otherwise.
   */
  offlineLogin(username, pin) {
    if (!this.db) return null;
    try {
      // SECURITY FIX: Look up by username only — NOT by PIN
      const user = this.db.prepare(
        'SELECT * FROM local_users WHERE username = ? AND active = 1'
      ).get(username);

      if (!user) return null;

      // Verify PIN
      if (user.pin_hash && user.pin_salt) {
        // Modern path: scrypt hashed PIN
        if (!this._verifyPin(pin, user.pin_hash, user.pin_salt)) {
          return null;
        }
      } else if (user.pin) {
        // Legacy path: plain-text PIN (migration should have converted these)
        if (pin !== user.pin) {
          return null;
        }
      } else {
        // No PIN set — deny login
        return null;
      }

      // Return user record without sensitive fields
      const { pin: _p, pin_hash: _ph, pin_salt: _ps, ...safeUser } = user;
      return safeUser;
    } catch (err) {
      console.warn('[SyncEngine] Offline login failed:', err.message);
      return null;
    }
  }

  /**
   * Cache users from the server during pull.
   * Performs a bulk replace so the local user cache always matches server.
   * PINs are hashed with scrypt before storage for security.
   */
  cacheUsers(users) {
    if (!this.db || !users || users.length === 0) return;

    try {
      // Transform user records to match local schema, hash PINs
      const mappedUsers = users.map((u) => {
        let pinHash = null;
        let pinSalt = null;
        let plainPin = null;

        if (u.pin_hash && u.pin_salt) {
          // User already has a scrypt hash from server
          pinHash = u.pin_hash;
          pinSalt = u.pin_salt;
        } else if (u.pin) {
          // Hash the PIN with scrypt before storing locally
          pinSalt = crypto.randomBytes(16).toString('hex');
          pinHash = this._hashPin(u.pin, pinSalt);
          // Keep plain pin as null — we only store hashed
        }

        return {
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role || 'Cashier',
          pin: plainPin,
          pin_hash: pinHash,
          pin_salt: pinSalt,
          active: u.active !== undefined ? (u.active ? 1 : 0) : 1,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        };
      });

      this._bulkUpsert('local_users', mappedUsers);
      console.log(`[SyncEngine] Cached ${mappedUsers.length} users for offline authentication`);
    } catch (err) {
      console.warn('[SyncEngine] Failed to cache users:', err.message);
    }
  }

  /**
   * Log an audit event for offline tracking.
   * Audit logs are synced to the server on the next push.
   */
  logAudit(action, entity, entityId, userId, details) {
    if (!this.db) return;
    try {
      this.db.prepare(
        'INSERT INTO local_audit_logs (userId, action, entity, entityId, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        userId || 'system',
        action,
        entity,
        entityId || null,
        details ? JSON.stringify(details) : null,
        new Date().toISOString()
      );

      // Add audit log to sync queue (for audit_logs table)
      this._addToSyncQueue('local_audit_logs', 'INSERT', entityId || `audit-${Date.now()}`, {
        action,
        entity,
        entityId,
        userId,
      });
    } catch (err) {
      console.warn('[SyncEngine] Failed to log audit:', err.message);
    }
  }

  /**
   * Get audit logs from the local database.
   */
  getAuditLogs(options) {
    if (!this.db) return [];
    let query = 'SELECT * FROM local_audit_logs';
    const params = [];
    const conditions = [];

    if (options && options.userId) {
      conditions.push('userId = ?');
      params.push(options.userId);
    }
    if (options && options.entity) {
      conditions.push('entity = ?');
      params.push(options.entity);
    }
    if (options && options.fromDate) {
      conditions.push('timestamp >= ?');
      params.push(options.fromDate);
    }
    if (options && options.toDate) {
      conditions.push('timestamp <= ?');
      params.push(options.toDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp DESC';

    if (options && options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get all local (cached) users.
   */
  getUsers() {
    if (!this.db) return [];
    return this.db.prepare('SELECT id, username, name, role, active, createdAt, updatedAt FROM local_users WHERE active = 1 ORDER BY name ASC').all();
  }

  // ================================================================
  // Read operations from local SQLite
  // ================================================================

  getMedicines(searchTerm) {
    if (!this.db) return [];
    if (searchTerm) {
      // FIX: Added parentheses around OR conditions for correct operator precedence
      return this.db
        .prepare(
          "SELECT * FROM local_medicines WHERE (name LIKE ? OR barcode LIKE ? OR genericName LIKE ?) AND active = 1 ORDER BY name ASC"
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
      // FIX: Added parentheses around OR conditions for correct operator precedence
      return this.db
        .prepare(
          "SELECT * FROM local_customers WHERE (name LIKE ? OR phone LIKE ?) AND active = 1 ORDER BY name ASC"
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
  // Pharmacy-Specific Features
  // ================================================================

  /**
   * Get medicines with batches expiring within N days.
   * @param {number} daysThreshold - Number of days threshold (default 30)
   * @returns {Array} Array of medicines with expiring batches
   */
  getExpiringMedicines(daysThreshold = 30) {
    if (!this.db) return [];
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    const threshold = thresholdDate.toISOString().split('T')[0]; // YYYY-MM-DD

    return this.db.prepare(`
      SELECT DISTINCT m.*,
        b.id as batchId, b.batchNo, b.expiryDate, b.stockQty, b.saleRate, b.mrp
      FROM local_medicines m
      INNER JOIN local_batches b ON b.medicineId = m.id
      WHERE b.expiryDate IS NOT NULL
        AND b.expiryDate <= ?
        AND b.expiryDate >= date('now')
        AND b.stockQty > 0
        AND b.active = 1
        AND m.active = 1
      ORDER BY b.expiryDate ASC, m.name ASC
    `).all(threshold);
  }

  /**
   * Get all medicines of a specific schedule type.
   * @param {string} scheduleType - OTC, ScheduleH, ScheduleH1, or Narcotic
   * @returns {Array} Array of medicines matching the schedule type
   */
  getScheduleDrugs(scheduleType) {
    if (!this.db) return [];
    return this.db.prepare(`
      SELECT * FROM local_medicines
      WHERE scheduleType = ? AND active = 1
      ORDER BY name ASC
    `).all(scheduleType);
  }

  /**
   * Get medicines where total stock across batches is below reorder level.
   * @returns {Array} Array of medicines with low stock
   */
  getLowStockMedicines() {
    if (!this.db) return [];
    return this.db.prepare(`
      SELECT m.*,
        COALESCE(SUM(b.stockQty), 0) as totalStock
      FROM local_medicines m
      LEFT JOIN local_batches b ON b.medicineId = m.id AND b.active = 1
      WHERE m.active = 1
      GROUP BY m.id
      HAVING totalStock < m.reorderLevel
      ORDER BY totalStock ASC, m.name ASC
    `).all();
  }

  // ================================================================
  // Sync Queue Management
  // ================================================================

  _addToSyncQueue(tableName, operation, recordId, data, syncBatchId) {
    try {
      const checksum = data ? crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex') : null;
      const batchId = syncBatchId || null;

      this.db.prepare(
        'INSERT INTO sync_queue (table_name, operation, record_id, data_json, sync_batch_id, checksum) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(tableName, operation, recordId, JSON.stringify(data), batchId, checksum);
    } catch (err) {
      console.warn('[SyncEngine] Failed to add to sync queue:', err.message);
    }
  }

  getPendingQueueItems() {
    if (!this.db) return [];
    return this.db.prepare(
      'SELECT * FROM sync_queue WHERE synced = 0 AND retry_count < ? ORDER BY created_at ASC'
    ).all(MAX_RETRIES);
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
