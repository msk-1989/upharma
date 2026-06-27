// ---------------------------------------------------------------
// Offline / Online Status Bar Injector
// This script is injected into the renderer via preload
// and inserts a status bar at the very top of the page.
// ---------------------------------------------------------------

(function injectOfflineBar() {
  // Guard: only run inside Electron
  if (typeof window === 'undefined' || !window.electronAPI) return;

  const BAR_ID = 'upharma-connectivity-bar';

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #${BAR_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2147483647; /* Always on top */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 16px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.2px;
      transition: background-color 0.3s ease, color 0.3s ease;
      pointer-events: none;
      user-select: none;
    }

    #${BAR_ID}.online {
      background-color: #059669;
      color: #ffffff;
    }

    #${BAR_ID}.offline {
      background-color: #d97706;
      color: #ffffff;
    }

    #${BAR_ID}.online .bar-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6ee7b7;
      margin-right: 8px;
      box-shadow: 0 0 4px #6ee7b7;
      animation: pulse-green 2s ease-in-out infinite;
    }

    #${BAR_ID}.offline .bar-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fde68a;
      margin-right: 8px;
      animation: pulse-yellow 2s ease-in-out infinite;
    }

    @keyframes pulse-green {
      0%, 100% { opacity: 1; box-shadow: 0 0 4px #6ee7b7; }
      50% { opacity: 0.7; box-shadow: 0 0 8px #6ee7b7; }
    }

    @keyframes pulse-yellow {
      0%, 100% { opacity: 1; box-shadow: 0 0 4px #fde68a; }
      50% { opacity: 0.7; box-shadow: 0 0 8px #fde68a; }
    }
  `;
  document.head.appendChild(style);

  // Create bar element
  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = BAR_ID;
    document.documentElement.appendChild(bar); // Attached to <html> so it's above everything
  }

  /**
   * Update the bar appearance based on connectivity.
   */
  function updateBar(isOnline) {
    if (!bar) return;

    if (isOnline) {
      bar.className = 'online';
      bar.innerHTML = '<span class="bar-dot"></span>Connected to Server';
    } else {
      bar.className = 'offline';
      bar.innerHTML = '<span class="bar-dot"></span>Working Offline — Changes will sync when internet is available';
    }
  }

  // Set initial state
  window.electronAPI.isOnline().then(updateBar).catch(() => updateBar(false));

  // Listen for changes
  window.electronAPI.onOnlineStatusChange(updateBar);
})();
