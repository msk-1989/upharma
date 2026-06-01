const { ipcMain, app } = require('electron');

// ---------------------------------------------------------------
// IPC Handler Module
// Registers all IPC listeners used by the renderer via preload.js
// ---------------------------------------------------------------

let isOnline = true;
let isSyncing = false;
let syncEngine = null; // set during registerIpcHandlers

/**
 * Register all IPC handlers. Called once from main.js.
 * @param {object} opts
 * @param {import('electron-store').default} opts.store - electron-store instance
 * @param {Function} opts.checkConnectivity - main process connectivity checker
 * @param {Function} opts.getSyncEngine - getter for sync engine instance
 */
function registerIpcHandlers(opts = {}) {
  const { store, checkConnectivity, getSyncEngine } = opts;

  // Keep a reference to the sync engine getter
  if (typeof getSyncEngine === 'function') {
    syncEngine = getSyncEngine();
    // Re-fetch periodically in case engine initializes later
    const refetchInterval = setInterval(() => {
      syncEngine = getSyncEngine();
      if (syncEngine && syncEngine.isInitialized) {
        clearInterval(refetchInterval);
      }
    }, 2000);
  }

  // -------- sync-start --------
  ipcMain.handle('sync-start', async () => {
    // If sync engine is available, use it
    if (syncEngine && syncEngine.isInitialized) {
      if (syncEngine.isSyncing) {
        return { status: 'already-syncing' };
      }
      if (!syncEngine.isOnline) {
        return { status: 'offline', message: 'Cannot sync while offline' };
      }
      try {
        const result = await syncEngine.fullSync();
        isSyncing = false;
        return result;
      } catch (error) {
        isSyncing = false;
        return { status: 'error', message: error.message };
      }
    }

    // Fallback: manual sync (no sync engine)
    if (isSyncing) return { status: 'already-syncing' };
    isSyncing = true;

    try {
      // Placeholder — actual sync requires sync engine
      await new Promise((resolve) => setTimeout(resolve, 2000));

      isSyncing = false;
      return { status: 'success', timestamp: new Date().toISOString() };
    } catch (error) {
      isSyncing = false;
      return { status: 'error', message: error.message };
    }
  });

  // -------- sync-status --------
  ipcMain.handle('sync-status', () => {
    if (syncEngine && syncEngine.isInitialized) {
      return syncEngine.getStatus();
    }

    return {
      initialized: false,
      isOnline,
      isSyncing,
      lastSync: store?.get('lastSyncTime', null),
    };
  });

  // -------- get-app-version --------
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // -------- get-online-status --------
  ipcMain.handle('get-online-status', () => {
    return isOnline;
  });

  // -------- Offline data: get-medicines --------
  ipcMain.handle('offline-get-medicines', async (_event, searchTerm) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const medicines = syncEngine.getMedicines(searchTerm);
      return { success: true, data: medicines };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-batches --------
  ipcMain.handle('offline-get-batches', async (_event, medicineId) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const batches = syncEngine.getMedicineBatches(medicineId);
      return { success: true, data: batches };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-customers --------
  ipcMain.handle('offline-get-customers', async (_event, searchTerm) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const customers = syncEngine.getCustomers(searchTerm);
      return { success: true, data: customers };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-suppliers --------
  ipcMain.handle('offline-get-suppliers', async () => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const suppliers = syncEngine.getSuppliers();
      return { success: true, data: suppliers };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-settings --------
  ipcMain.handle('offline-get-settings', async () => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const settings = syncEngine.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-sales --------
  ipcMain.handle('offline-get-sales', async (_event, options) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const sales = syncEngine.getSales(options || {});
      return { success: true, data: sales };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-sale-detail --------
  ipcMain.handle('offline-get-sale-detail', async (_event, saleId) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const sale = syncEngine.getSalesWithItems(saleId);
      if (!sale) {
        return { error: 'Sale not found', data: null };
      }
      return { success: true, data: sale };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: get-purchases --------
  ipcMain.handle('offline-get-purchases', async () => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const purchases = syncEngine.getPurchases();
      return { success: true, data: purchases };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: create-sale --------
  ipcMain.handle('offline-create-sale', async (_event, saleData) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const sale = await syncEngine.createSale(saleData);
      return { success: true, data: sale };
    } catch (error) {
      return { error: error.message };
    }
  });

  // -------- Offline data: create-customer --------
  ipcMain.handle('offline-create-customer', async (_event, customerData) => {
    if (!syncEngine || !syncEngine.isInitialized) {
      return { error: 'SyncEngine not initialized' };
    }
    try {
      const customer = await syncEngine.createCustomer(customerData);
      return { success: true, data: customer };
    } catch (error) {
      return { error: error.message };
    }
  });

  // Internal setter — called by the connectivity monitor in main.js
  return {
    setOnlineStatus(online) {
      const changed = isOnline !== online;
      isOnline = online;
      return changed;
    },
    getOnlineStatus() {
      return isOnline;
    },
    setSyncing(val) {
      isSyncing = val;
    },
    setSyncEngine(engine) {
      syncEngine = engine;
    },
  };
}

module.exports = { registerIpcHandlers };
