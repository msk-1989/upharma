const { contextBridge, ipcRenderer } = require('electron');

// ---------------------------------------------------------------
// Secure bridge between Electron main process and the renderer
// contextIsolation is ENABLED — only these APIs are exposed
// nodeIntegration is DISABLED — no Node.js in renderer
// ---------------------------------------------------------------

contextBridge.exposeInMainWorld('electronAPI', {
  // Flag so the web-app can detect it is running inside Electron
  isElectron: true,

  // -------- Online / Offline --------
  isOnline: () => ipcRenderer.invoke('get-online-status'),

  // Listen for connectivity changes pushed from the main process
  onOnlineStatusChange: (callback) => {
    const handler = (_event, isOnline) => callback(isOnline);
    ipcRenderer.on('online-status-change', handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('online-status-change', handler);
  },

  // -------- Sync --------
  syncStart: () => ipcRenderer.invoke('sync-start'),
  syncStatus: () => ipcRenderer.invoke('sync-status'),

  // Sync event listeners — return cleanup functions
  onSyncProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('sync-progress', handler);
    return () => ipcRenderer.removeListener('sync-progress', handler);
  },

  onSyncComplete: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('sync-complete', handler);
    return () => ipcRenderer.removeListener('sync-complete', handler);
  },

  onSyncError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('sync-error', handler);
    return () => ipcRenderer.removeListener('sync-error', handler);
  },

  // -------- Offline Data Access --------
  // These allow the renderer to query the local SQLite DB
  offlineGetMedicines: (searchTerm) => ipcRenderer.invoke('offline-get-medicines', searchTerm),
  offlineGetMedicineBatches: (medicineId) => ipcRenderer.invoke('offline-get-batches', medicineId),
  offlineGetCustomers: (searchTerm) => ipcRenderer.invoke('offline-get-customers', searchTerm),
  offlineGetSuppliers: () => ipcRenderer.invoke('offline-get-suppliers'),
  offlineGetSettings: () => ipcRenderer.invoke('offline-get-settings'),
  offlineGetSales: (options) => ipcRenderer.invoke('offline-get-sales', options),
  offlineGetSaleDetail: (saleId) => ipcRenderer.invoke('offline-get-sale-detail', saleId),
  offlineGetPurchases: () => ipcRenderer.invoke('offline-get-purchases'),

  // -------- Offline Data Creation --------
  offlineCreateSale: (saleData) => ipcRenderer.invoke('offline-create-sale', saleData),
  offlineCreateCustomer: (customerData) => ipcRenderer.invoke('offline-create-customer', customerData),

  // -------- App info --------
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // -------- Window controls --------
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});
