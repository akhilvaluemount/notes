const { contextBridge, ipcRenderer } = require('electron');

// Expose Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get available screen capture sources
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Check if screen recording permission is granted (macOS)
  checkScreenPermission: () => ipcRenderer.invoke('check-screen-permission'),

  // Request screen recording permission (macOS)
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),

  // Type code character by character (simulates keyboard typing)
  typeCode: (code, delay = 20) => ipcRenderer.invoke('type-code', { code, delay }),

  // Cancel typing and show window
  cancelTyping: () => ipcRenderer.invoke('cancel-typing'),

  // Check if running in Electron
  isElectron: true
});

// Log that preload script has loaded
console.log('Electron preload script loaded');
