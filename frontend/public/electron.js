const { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, session } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    alwaysOnTop: true,
    resizable: true,
    frame: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Set always on top with floating level - ensures it stays above all other windows
  mainWindow.setAlwaysOnTop(true, 'floating');

  // For macOS, also set the window level to ensure it floats above fullscreen apps
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Enable screen capture for getDisplayMedia - this is the key fix!
  // This allows the renderer to use navigator.mediaDevices.getDisplayMedia()
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    // Get screens first (entire display), prioritize over windows
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen (entire display) - no picker needed
      if (sources.length > 0) {
        console.log('Screen capture: Granting access to entire screen:', sources[0].name);
        callback({ video: sources[0], audio: 'loopback' });
      } else {
        // Fallback to any source if no screens found
        desktopCapturer.getSources({ types: ['screen', 'window'] }).then((allSources) => {
          if (allSources.length > 0) {
            callback({ video: allSources[0], audio: 'loopback' });
          } else {
            callback({ video: null });
          }
        });
      }
    }).catch((error) => {
      console.error('Error getting sources for display media:', error);
      callback({ video: null });
    });
  });

  // Load React app (dev or production)
  const startUrl = process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle screen capture sources request (for custom picker if needed)
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 }
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting desktop sources:', error);
    return [];
  }
});

// Check screen recording permission (macOS)
ipcMain.handle('check-screen-permission', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen');
    return status === 'granted';
  }
  return true; // Windows doesn't need explicit permission
});

// Request screen recording permission (macOS)
ipcMain.handle('request-screen-permission', async () => {
  if (process.platform === 'darwin') {
    // This will prompt the user to grant permission
    try {
      await desktopCapturer.getSources({ types: ['screen'] });
    } catch (e) {
      console.log('Permission request triggered');
    }
    return systemPreferences.getMediaAccessStatus('screen') === 'granted';
  }
  return true;
});

// Type code using clipboard paste (most reliable method)
// This copies code to clipboard and pastes it
ipcMain.handle('type-code', async (event, { code, delay = 20 }) => {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin') {
      reject(new Error('Type code feature only supported on macOS'));
      return;
    }

    // Minimize the Electron window so user can focus on target app
    if (mainWindow) {
      mainWindow.hide();
    }

    // Escape the code for AppleScript string
    const escapedCode = code
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\t/g, '    '); // Convert tabs to 4 spaces

    // AppleScript to:
    // 1. Set clipboard to the code
    // 2. Paste at current cursor position (Cmd+V)
    const appleScript = `
      set the clipboard to "${escapedCode}"
      delay 0.1
      tell application "System Events"
        keystroke "v" using {command down}
      end tell
    `;

    exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, (error, stdout, stderr) => {
      // Show the window again after typing is done
      if (mainWindow) {
        mainWindow.show();
      }

      if (error) {
        console.error('Error typing code:', error);
        reject(error);
      } else {
        console.log('Code typed successfully');
        resolve({ success: true });
      }
    });
  });
});

// Cancel typing (show window again)
ipcMain.handle('cancel-typing', async () => {
  if (mainWindow) {
    mainWindow.show();
  }
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
