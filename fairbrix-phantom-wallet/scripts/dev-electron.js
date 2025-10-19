// Minimal dev orchestrator: start Vite then launch Electron when ready
import { spawn } from 'node:child_process';
import http from 'node:http';

function waitFor(url, { timeoutMs = 20000, intervalMs = 500 } = {}) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http.get(url, res => {
        res.resume();
        resolve(true);
      }).on('error', () => {
        if (Date.now() - t0 > timeoutMs) return reject(new Error('timeout'));
        setTimeout(tick, intervalMs);
      });
    };
    tick();
  });
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npmCmd, ['run', 'dev'], { stdio: 'inherit' });

waitFor('http://localhost:5173').then(() => {
  const env = { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5173' };
  const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  const child = spawn(electronCmd, ['.'], { stdio: 'inherit', env });
  child.on('exit', (code) => {
    try { vite.kill(); } catch {}
    process.exit(code || 0);
  });
}).catch(() => {
  console.error('Vite dev server did not start in time.');
  try { vite.kill(); } catch {}
  process.exit(1);
});

