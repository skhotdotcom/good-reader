// Preload script runs in the renderer process before the page loads.
// Keep this minimal — the app communicates via HTTP (localhost) not IPC.
// contextBridge could expose Electron APIs here if ever needed.
