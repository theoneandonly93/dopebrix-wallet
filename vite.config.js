import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fairbrixNodePlugin() {
  let started = false;
  let child;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Cross-platform/WSL: prefer platform default, but fall back to the other if not found
  const primaryName = process.platform === 'win32' ? 'fbrix.exe' : 'fbrix';
  const altName = primaryName === 'fbrix.exe' ? 'fbrix' : 'fbrix.exe';
  const primaryPath = path.resolve(__dirname, 'fbrix-node', primaryName);
  const altPath = path.resolve(__dirname, 'fbrix-node', altName);
  const exePath = fs.existsSync(primaryPath) ? primaryPath : (fs.existsSync(altPath) ? altPath : primaryPath);
  const confPath = path.resolve(__dirname, 'fbrix-node', 'fbx.conf');
  const dataDir = path.resolve(__dirname, 'fbrix-node', 'data');

  const start = (label = 'dev') => {
    if (started) return;
    started = true;
    try {
      const envFlag = process.env.START_FAIRBRIX_NODE || '';
      if (/^(0|false|no)$/i.test(envFlag)) {
        console.log(`[fairbrix] auto-start disabled by START_FAIRBRIX_NODE=${envFlag}`);
        return;
      }

      // If requested, try to start Fairbrix-pack's launcher instead of the bundled node
      const usePack = /^(1|true|yes|on)$/i.test(String(process.env.USE_FAIRBRIX_PACK || ''));
      if (usePack) {
        const packDir = process.env.FAIRBRIX_PACK_DIR || '';
        const packExe = process.env.FAIRBRIX_PACK_EXE || (packDir ? path.resolve(packDir, 'START_Fairbrix.exe') : '');
        const candidates = [
          packExe,
          path.resolve(process.cwd(), 'Fairbrix-pack', 'START_Fairbrix.exe'),
          path.resolve(process.cwd(), '..', 'Fairbrix-pack', 'START_Fairbrix.exe'),
        ].filter(Boolean);
        for (const c of candidates) {
          if (c && fs.existsSync(c)) {
            try {
              child = spawn(c, [], { stdio: 'ignore', windowsHide: true, detached: true });
              child.unref();
              console.log(`[fairbrix] started Fairbrix-pack (${label}) -> ${c}`);
              return; // don't start bundled node
            } catch (e) {
              console.warn(`[fairbrix] failed to start Fairbrix-pack at ${c}:`, e?.message || e);
            }
          }
        }
        console.warn('[fairbrix] USE_FAIRBRIX_PACK set but START_Fairbrix.exe not found; falling back to bundled node');
      }
      if (!fs.existsSync(exePath)) {
        console.warn(`[fairbrix] ${exeName} not found at ${exePath}. Skipping auto-start.`);
        return;
      }
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
      child = spawn(exePath, [`-conf=${confPath}`, `-datadir=${dataDir}`], {
        stdio: 'ignore',
        windowsHide: true,
      });
      console.log(`[fairbrix] started node (${label}) -> ${exePath}`);
      process.on('exit', () => { try { child && child.kill(); } catch {} });
      process.on('SIGINT', () => { try { child && child.kill(); } catch {}; process.exit(); });
      process.on('SIGTERM', () => { try { child && child.kill(); } catch {}; process.exit(); });
    } catch (e) {
      console.warn(`[fairbrix] failed to start node (${label}):`, e?.message || e);
    }
  };

  return {
    name: 'fairbrix-node-starter',
    apply: 'serve',
    configureServer() { start('serve'); },
    // Attempt to also start for `vite preview` if supported by this Vite version
    configurePreviewServer() { start('preview'); },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const rpcUrl = env.VITE_FAIRBRIX_RPC_URL || 'http://127.0.0.1:8645';
  const rpcUser = env.VITE_FAIRBRIX_RPC_USER || '';
  const rpcPass = env.VITE_FAIRBRIX_RPC_PASS || '';
  const basic = Buffer.from(`${rpcUser}:${rpcPass}`).toString('base64');

  return {
    plugins: [react(), fairbrixNodePlugin()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/rpc': {
          target: rpcUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/rpc(\/)?/, '/'),
          headers: (rpcUser || rpcPass) ? { Authorization: `Basic ${basic}` } : {},
        },
      },
    },
  };
});
