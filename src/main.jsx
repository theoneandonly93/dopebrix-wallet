import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SafeBoundary } from './App.jsx';
import { registerSW } from './registerSW.js';
import './styles.css';

// Automatically start Fairbrix node when wallet opens (desktop/electron only)
if (window && window.process && window.require) {
  try {
    const { execFile } = window.require('child_process');
    const path = window.require('path');
    const exePath = path.join(__dirname, '../fbrix-node/fbrix.exe');
    const confPath = path.join(__dirname, '../fbrix-node/fbx.conf');
    execFile(exePath, ['-conf=' + confPath], (error) => {
      if (error) console.error('Fairbrix node failed to start:', error);
    }).unref();
  } catch (e) {
    console.error('Node auto-start error:', e);
  }
}

// One-time migration: clear invalid/stale locally-cached FBX address
// - Offline check: Base58Check + version byte 0x5f ('f' addresses)
// - Online check (best-effort): RPC validateaddress via fairbrix service
(async () => {
  try {
    const addr = localStorage.getItem('fbx_addr');
    if (!addr) return;
    const isValidB58 = (a) => {
      try {
        const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const b58decode = (s) => {
          let x = 0n; for (const c of s) { const i = alphabet.indexOf(c); if (i < 0) throw new Error('bad char'); x = x * 58n + BigInt(i); }
          let arr = []; while (x > 0n) { arr.push(Number(x & 0xffn)); x >>= 8n; } arr = arr.reverse();
          let zeros = 0; for (const c of s) { if (c === '1') zeros++; else break; }
          return Uint8Array.from([...Array(zeros).fill(0), ...arr]);
        };
        const dblsha256 = (buf) => crypto.subtle.digest('SHA-256', buf).then(h => crypto.subtle.digest('SHA-256', h));
        return (async () => {
          const buf = b58decode(a);
          if (buf.length < 5) return false;
          const data = buf.slice(0, buf.length - 4);
          const chk = buf.slice(buf.length - 4);
          const h = new Uint8Array(await dblsha256(data));
          for (let i = 0; i < 4; i++) if (chk[i] !== h[i]) return false;
          // version 0x5f required for Fairbrix P2PKH
          return data[0] === 0x5f;
        })();
      } catch { return false; }
    };
    const okOffline = await isValidB58(addr);
    if (!okOffline) { localStorage.removeItem('fbx_addr'); return; }
    // Try online validation (non-fatal if unavailable)
    try {
      const mod = await import('./services/fairbrix.js');
      const v = await mod.fairbrix.validateAddress(addr);
      if (v?.isvalid === false) localStorage.removeItem('fbx_addr');
    } catch {}
  } catch {}
})();


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SafeBoundary>
      <App />
    </SafeBoundary>
  </React.StrictMode>
);

registerSW();
