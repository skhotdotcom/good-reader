const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

const PORT = process.env.PORT || 3000;
const isDev = !app.isPackaged;

let mainWindow;
let nextProcess;

// In production, the app files live next to the electron/ folder inside the ASAR
function getAppRoot() {
  return isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app');
}

function startNextServer() {
  const appRoot = getAppRoot();
  const userDataPath = app.getPath('userData');
  const nextBin = path.join(appRoot, 'node_modules', '.bin', 'next');

  nextProcess = spawn(nextBin, ['start', '--port', String(PORT)], {
    cwd: appRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // Tell db.ts where to store the SQLite database
      GOOD_READER_DATA_DIR: userDataPath,
    },
    stdio: 'pipe',
  });

  nextProcess.stdout?.on('data', (d) =>
    console.log('[next]', d.toString().trim())
  );
  nextProcess.stderr?.on('data', (d) =>
    console.error('[next]', d.toString().trim())
  );

  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[next] exited with code ${code}`);
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    // Seamless titlebar on macOS
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open target="_blank" links in the system browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Also intercept navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    // In dev mode next dev is already running (started by electron:dev script)
    console.log(`[electron] Dev mode — connecting to http://localhost:${PORT}`);
    await waitOn({
      resources: [`http://localhost:${PORT}`],
      timeout: 30_000,
    });
  } else {
    // In production, start the Next.js server ourselves
    startNextServer();
    await waitOn({
      resources: [`http://localhost:${PORT}`],
      timeout: 60_000,
    });
  }

  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(createWindow);

// Re-open window on macOS when clicking the dock icon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  nextProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  nextProcess?.kill();
});
