const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = !app.isPackaged;

let mainWindow;

function getAppRoot() {
  // In a packaged build, resources are in process.resourcesPath/app
  return isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app');
}

// Poll until Next.js is accepting connections — no external dependency needed
function waitForPort(port, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    function attempt() {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() < deadline) {
          setTimeout(attempt, 500);
        } else {
          reject(new Error(`Next.js server on port ${port} did not start within ${timeout}ms`));
        }
      });
      req.end();
    }
    attempt();
  });
}

// Run Next.js programmatically inside Electron's own Node runtime.
// This avoids needing a standalone `node` binary or any .bin symlinks,
// both of which break inside ASAR archives.
async function startNextServer(appRoot) {
  const { parse } = require('url');
  const nextModule = require(path.join(appRoot, 'node_modules', 'next'));
  const next = nextModule.default || nextModule;

  const nextApp = next({ dev: false, dir: appRoot, port: PORT, hostname: '127.0.0.1' });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  await new Promise((resolve, reject) => {
    http
      .createServer((req, res) => handle(req, res, parse(req.url, true)))
      .listen(PORT, '127.0.0.1', (err) => {
        if (err) reject(err);
        else {
          console.log(`[good-reader] server ready on http://localhost:${PORT}`);
          resolve();
        }
      });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Route target="_blank" links to the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Intercept any navigation away from localhost so external links open properly
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const appRoot = getAppRoot();

  if (isDev) {
    // Development: `npm run dev` is already running in another terminal
    console.log('[electron] waiting for Next.js dev server...');
    await waitForPort(PORT);
  } else {
    // Production: set the data-dir env var BEFORE Next.js loads (db.ts reads it at import time)
    process.env.GOOD_READER_DATA_DIR = app.getPath('userData');
    process.env.NODE_ENV = 'production';
    await startNextServer(appRoot);
  }

  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(createWindow);

// Re-open on macOS when clicking the dock icon with no windows open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
