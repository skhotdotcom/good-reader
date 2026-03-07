const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const isDev = !app.isPackaged;

// In dev, connect to the already-running Next.js dev server on 3000.
// In production, pick a random free port so the app never conflicts with dev servers.
function getFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

let PORT = 3000; // overwritten at startup in production

// __dirname is always electron/ — going up one level gives the app root,
// whether running in dev (filesystem) or packaged (app.asar or plain dir).
const APP_ROOT = path.join(__dirname, '..');

let mainWindow;

// Poll until the server is accepting connections
function waitForPort(port, timeout = 60_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    function attempt() {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(attempt, 500);
        else reject(new Error(`Next.js did not start on port ${port} within ${timeout / 1000}s`));
      });
      req.end();
    }
    attempt();
  });
}

async function startNextServer() {
  process.env.GOOD_READER_DATA_DIR = app.getPath('userData');
  process.env.NODE_ENV = 'production';

  console.log('[electron] APP_ROOT:', APP_ROOT);
  console.log('[electron] userData:', process.env.GOOD_READER_DATA_DIR);

  const nextModule = require(path.join(APP_ROOT, 'node_modules', 'next'));
  const next = nextModule.default || nextModule;

  const nextApp = next({ dev: false, dir: APP_ROOT, port: PORT, hostname: '127.0.0.1' });
  const handle = nextApp.getRequestHandler();

  console.log('[electron] preparing Next.js…');
  await nextApp.prepare();
  console.log('[electron] Next.js ready, starting HTTP server…');

  await new Promise((resolve, reject) => {
    const { parse } = require('url');
    http
      .createServer((req, res) => handle(req, res, parse(req.url, true)))
      .listen(PORT, '127.0.0.1', (err) => {
        if (err) reject(err);
        else { console.log(`[electron] listening on http://127.0.0.1:${PORT}`); resolve(); }
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const base = `http://127.0.0.1:${PORT}`;
    if (!url.startsWith(base)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  try {
    if (isDev) {
      console.log('[electron] dev — waiting for Next.js dev server…');
      await waitForPort(PORT);
    } else {
      await startNextServer();
    }
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    console.error('[electron] startup failed:', err);
    mainWindow.loadURL(
      `data:text/html,<body style="font:14px monospace;padding:24px;color:#c00">` +
      `<b>Good Reader failed to start</b><br><br><pre>${err.message}</pre></body>`
    );
  }
}

function setupAutoUpdater() {
  // Don't check for updates in dev mode
  if (isDev) return;

  const { autoUpdater } = require('electron-updater');

  autoUpdater.autoDownload = process.platform !== 'darwin'; // macOS: unsigned builds can't auto-install
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (process.platform === 'darwin') {
      // macOS unsigned: can't auto-install — open GitHub Releases instead
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Good Reader ${info.version} is available.`,
        detail: 'Download the new version from GitHub Releases.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) shell.openExternal('https://github.com/skhotdotcom/good-reader/releases/latest');
      });
    }
    // Windows: download starts automatically
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of Good Reader has been downloaded.',
      detail: 'Restart the app to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err.message);
  });

  // Check after a short delay so the window is ready
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);
}

app.whenReady().then(async () => {
  if (!isDev) PORT = await getFreePort();
  await createWindow();
  setupAutoUpdater();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
