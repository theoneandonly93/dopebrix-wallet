import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

let nodeChild;

function resourcePath(...p) {
  // In production, assets live under process.resourcesPath. In dev, fallback to project root
  const prod = path.join(process.resourcesPath, ...p);
  if (fs.existsSync(prod)) return prod;
  return path.join(process.cwd(), ...p);
}

function startFairbrixNode() {
  try {
    const usePack = /^(1|true|yes|on)$/i.test(String(process.env.USE_FAIRBRIX_PACK || ''));
    if (usePack) {
      const packDir = process.env.FAIRBRIX_PACK_DIR || '';
      const packExe = process.env.FAIRBRIX_PACK_EXE || (packDir ? path.join(packDir, 'START_Fairbrix.exe') : '');
      const candidates = [
        packExe,
        path.join(process.cwd(), 'Fairbrix-pack', 'START_Fairbrix.exe'),
        path.join(process.cwd(), '..', 'Fairbrix-pack', 'START_Fairbrix.exe'),
      ].filter(Boolean);
      for (const c of candidates) {
        if (c && fs.existsSync(c)) {
          nodeChild = spawn(c, [], { stdio: 'ignore', windowsHide: true, detached: true });
          nodeChild.unref();
          console.log('[fairbrix] started Fairbrix-pack');
          return;
        }
      }
      console.warn('[fairbrix] USE_FAIRBRIX_PACK set but START_Fairbrix.exe not found; falling back to bundled node');
    }

    const exeName = process.platform === 'win32' ? 'fbrix.exe' : 'fbrix';
    const base = resourcePath('fbrix-node');
    const exePath = path.join(base, exeName);
    const confPath = path.join(base, 'fbx.conf');
    const dataDir = path.join(base, 'data');

    if (!fs.existsSync(exePath)) {
      console.warn('[fairbrix] binary not found at', exePath);
      return;
    }
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    const envFlag = process.env.START_FAIRBRIX_NODE || '';
    if (/^(0|false|no)$/i.test(envFlag)) {
      console.log('[fairbrix] auto-start disabled by START_FAIRBRIX_NODE');
      return;
    }
    nodeChild = spawn(exePath, [`-conf=${confPath}`, `-datadir=${dataDir}`], {
      stdio: 'ignore',
      windowsHide: true,
    });
    nodeChild.unref();
    console.log('[fairbrix] node started');
  } catch (e) {
    console.warn('[fairbrix] failed to start node:', e?.message || e);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 780,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      devTools: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    const indexPath = resourcePath('dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  startFairbrixNode();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try { nodeChild && nodeChild.kill(); } catch {}
    app.quit();
  }
});
