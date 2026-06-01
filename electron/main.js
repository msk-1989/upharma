const {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  shell,
  nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

// ---------------------------------------------------------------
// Modules
// ---------------------------------------------------------------
const { createTray, updateTrayTooltip } = require('./tray');
const { registerIpcHandlers } = require('./ipc');
const { SyncEngine } = require('./sync-engine');

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------
const APP_URL = 'https://upharma.vercel.app';
const APP_TITLE = 'uPharma - Pharmacy Management';
const APP_MIN_WIDTH = 1280;
const APP_MIN_HEIGHT = 720;
const APP_DEFAULT_WIDTH = 1440;
const APP_DEFAULT_HEIGHT = 900;
const CONNECTIVITY_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const SPLASH_MIN_DISPLAY_MS = 2000; // Show splash at least 2 seconds

// ---------------------------------------------------------------
// Single Instance Lock
// ---------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ---------------------------------------------------------------
// Globals
// ---------------------------------------------------------------
let mainWindow = null;
let splashWindow = null;
let connectivityTimer = null;
let ipcState = null; // returned from registerIpcHandlers
let syncEngine = null; // SyncEngine instance

// ---------------------------------------------------------------
// Prevent sandbox issues on some Linux distros
// ---------------------------------------------------------------
app.disableHardwareAcceleration();
app.setAppUserModelId('com.multinex.upharma.desktop');

// ---------------------------------------------------------------
// Protocol handler for app:// local resources
// ---------------------------------------------------------------
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

// ---------------------------------------------------------------
// Create assets directory (needed for tray icons etc.)
// ---------------------------------------------------------------
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate a default 256×256 icon (emerald green with "U")
function generateDefaultIcon(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="50%" stop-color="#047857"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.16)}" fill="url(#g)"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-family="Segoe UI,Arial,sans-serif" font-size="${Math.round(size * 0.48)}"
      font-weight="700" fill="white">U</text>
  </svg>`;

  return nativeImage.createFromBuffer(Buffer.from(svg));
}

// Write a PNG-ish placeholder (nativeImage can work with SVG buffers)
const defaultIcon = generateDefaultIcon(256);

// ---------------------------------------------------------------
// Connectivity Check
// ---------------------------------------------------------------
function checkConnectivity() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    socket.connect(443, 'vercel.app', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(false);
    });
  });
}

async function connectivityMonitor() {
  try {
    const online = await checkConnectivity();

    if (ipcState) {
      const changed = ipcState.setOnlineStatus(online);
      if (changed && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('online-status-change', online);
      }
    }

    // Notify sync engine of connectivity change
    if (syncEngine) {
      syncEngine.setOnlineStatus(online);
    }

    updateTrayTooltip(online ? 'uPharma — Connected' : 'uPharma — Offline');
  } catch (_) {
    // Silently ignore connectivity check errors
  }
}

function startConnectivityMonitor() {
  connectivityMonitor();
  connectivityTimer = setInterval(connectivityMonitor, CONNECTIVITY_CHECK_INTERVAL_MS);
}

function stopConnectivityMonitor() {
  if (connectivityTimer) {
    clearInterval(connectivityTimer);
    connectivityTimer = null;
  }
}

// ---------------------------------------------------------------
// Sync Engine Setup
// ---------------------------------------------------------------
async function initializeSyncEngine() {
  try {
    syncEngine = new SyncEngine({
      appId: 'com.multinex.upharma.desktop',
    });

    // Register event handlers to forward to renderer
    syncEngine.on('sync-start', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-progress', { phase: 'start', ...data });
      }
      updateTrayTooltip('uPharma — Syncing...');
    });

    syncEngine.on('sync-progress', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-progress', data);
      }
    });

    syncEngine.on('sync-complete', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-complete', data);
      }
      updateTrayTooltip('uPharma — Connected');
    });

    syncEngine.on('sync-error', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-error', data);
      }
      updateTrayTooltip('uPharma — Sync Error');
    });

    syncEngine.on('online', () => {
      console.log('[SyncEngine] Online — ready to sync');
    });

    syncEngine.on('offline', () => {
      console.log('[SyncEngine] Offline — working locally');
    });

    await syncEngine.init();

    // Start auto-sync every 5 minutes
    syncEngine.startAutoSync(5 * 60 * 1000);

    console.log('[App] Sync engine initialized and auto-sync started');
  } catch (err) {
    console.error('[App] Sync engine initialization failed:', err.message);
    // Don't crash the app — sync is optional, app can still work online
  }
}

// ---------------------------------------------------------------
// app:// protocol handler
// ---------------------------------------------------------------
function setupAppProtocol() {
  protocol.handle('app', (request) => {
    const filePath = path.join(__dirname, request.url.replace('app://', ''));
    return new Response(fs.readFileSync(filePath), {
      headers: { 'Content-Type': 'text/html' },
    });
  });
}

// ---------------------------------------------------------------
// Splash Screen
// ---------------------------------------------------------------
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    transparent: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: defaultIcon,
    show: false,
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow.center();
    splashWindow.show();
  });

  return splashWindow;
}

// ---------------------------------------------------------------
// Main Window
// ---------------------------------------------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: APP_DEFAULT_WIDTH,
    height: APP_DEFAULT_HEIGHT,
    minWidth: APP_MIN_WIDTH,
    minHeight: APP_MIN_HEIGHT,
    title: APP_TITLE,
    icon: defaultIcon,
    show: false,
    frame: false,
    backgroundColor: '#022c22',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      // Security: restrict navigation and new windows
      navigateOnDragDrop: false,
    },
  });

  // ---- Security: CSP Headers ----
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const csp = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:`,
        `style-src 'self' 'unsafe-inline' https: http:`,
        `img-src 'self' data: blob: https: http:`,
        `font-src 'self' data: https: http:`,
        `connect-src 'self' https: http: wss: ws:`,
        `frame-src 'self' https:`,
        `media-src 'self' https: http: blob:`,
        `object-src 'none"`,
        `base-uri 'self'`,
      ].join('; ');

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
        },
      });
    }
  );

  // ---- Open external links in the OS browser ----
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ---- Handle external protocol requests ----
  mainWindow.webContents.on('will-frame-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.protocol !== 'app:') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // ---- Inject offline bar after page loads ----
  mainWindow.webContents.on('did-finish-load', () => {
    const offlineBarScript = fs.readFileSync(
      path.join(__dirname, 'renderer-offline-bar.js'),
      'utf-8'
    );
    mainWindow.webContents.executeJavaScript(offlineBarScript).catch(() => {});
  });

  // ---- Load the app URL ----
  mainWindow.loadURL(APP_URL, {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) uPharma-Desktop/1.0.0 Chrome/120.0.0.0 Electron/34.0.0 Safari/537.36',
  });

  // ---- Show window when ready (with minimum splash display time) ----
  const splashStartTime = Date.now();
  mainWindow.webContents.once('did-finish-load', () => {
    const elapsed = Date.now() - splashStartTime;
    const remaining = Math.max(0, SPLASH_MIN_DISPLAY_MS - elapsed);

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
      }
    }, remaining);
  });

  // ---- Window state management ----

  // Close to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // IPC window controls from preload
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  });

  return mainWindow;
}

// ---------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------
app.whenReady().then(async () => {
  // Setup app:// protocol
  setupAppProtocol();

  // Register IPC handlers
  ipcState = registerIpcHandlers({
    store: null, // electron-store can be added here if needed
    checkConnectivity,
    getSyncEngine: () => syncEngine, // pass sync engine ref to IPC handlers
  });

  // Create windows
  createSplashWindow();
  createMainWindow();

  // Create system tray
  createTray(mainWindow, () => {
    // Sync now callback from tray — trigger sync via IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync-start-from-tray');
    }
    // Also directly trigger sync if sync engine is available
    if (syncEngine && syncEngine.isOnline && !syncEngine.isSyncing) {
      syncEngine.fullSync().catch(() => {});
    }
  });

  // Start connectivity monitoring
  startConnectivityMonitor();

  // Initialize sync engine (after connectivity check runs once)
  await initializeSyncEngine();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopConnectivityMonitor();
    app.quit();
  }
});

// Proper cleanup on quit
app.on('before-quit', () => {
  app.isQuitting = true;
  stopConnectivityMonitor();

  // Close sync engine
  if (syncEngine) {
    syncEngine.close().catch(() => {});
  }
});
