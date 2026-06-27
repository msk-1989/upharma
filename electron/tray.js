const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');

// ---------------------------------------------------------------
// System Tray Module
// Creates a tray icon with a right-click context menu
// ---------------------------------------------------------------

let tray = null;

/**
 * Creates the system tray icon and context menu.
 * @param {import('electron').BrowserWindow} mainWindow - Reference to the main app window
 * @param {Function} onSyncNow - Callback triggered when "Sync Now" is clicked
 */
function createTray(mainWindow, onSyncNow) {
  // Build a 16×16 tray icon programmatically (emerald circle with "U")
  const iconSize = 16;
  const icon = nativeImage.createEmpty();

  // Use a simple coloured square as the tray icon
  const trayIcon = nativeImage.createFromBuffer(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}">
        <rect width="${iconSize}" height="${iconSize}" rx="3" fill="#059669"/>
        <text x="${iconSize / 2}" y="${iconSize / 2 + 1}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="white">U</text>
      </svg>`
    )
  );

  tray = new Tray(trayIcon);
  tray.setToolTip('uPharma - Pharmacy Management');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open uPharma',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: () => {
        if (typeof onSyncNow === 'function') onSyncNow();
      },
    },
    {
      label: 'Check for Updates',
      click: () => {
        // Placeholder — can be wired to an auto-updater later
        if (mainWindow) {
          mainWindow.webContents.send('check-for-updates');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click tray icon to show the window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Update the tray tooltip (e.g. to show sync status).
 * @param {string} text
 */
function updateTrayTooltip(text) {
  if (tray) tray.setToolTip(text);
}

module.exports = { createTray, updateTrayTooltip };
