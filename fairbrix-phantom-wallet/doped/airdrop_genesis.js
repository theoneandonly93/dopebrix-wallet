// Posts doped/airdrops.json to the app's /api/dope?path=genesis endpoint
// and prints a brief verification summary.
// Usage:
//   node -r dotenv/config doped/airdrop_genesis.js [--base https://www.dopebrix.com] [--file doped/airdrops.json]
// Env (optional):
//   DEPLOY_BASE=https://www.dopebrix.com

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { base: process.env.DEPLOY_BASE || process.env.APP_BASE || 'https://www.dopebrix.com', file: 'doped/airdrops.json' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i] || out.base;
    else if (a === '--file') out.file = argv[++i] || out.file;
  }
  return out;
}

function readJson(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }

function uniqueAddresses(list) {
  const seen = new Set();
  const out = [];
  for (const it of list || []) {
    const a = String(it?.address || '').trim();
    if (!a) continue; if (seen.has(a)) continue; seen.add(a); out.push(a);
  }
  return out;
}

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return j;
}

async function getText(url) { const r = await fetch(url); return r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)); }
async function getJson(url) { const t = await getText(url); try { return JSON.parse(t); } catch { return {}; } }

async function main() {
  const { base, file } = parseArgs(process.argv);
  const airdropsPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(airdropsPath)) {
    console.error(`Airdrops file not found: ${airdropsPath}`);
    process.exit(1);
  }
  const payload = readJson(airdropsPath);
  const list = Array.isArray(payload?.airdrops) ? payload.airdrops : [];
  if (!list.length) { console.error('Airdrops array is empty'); process.exit(2); }

  const root = String(base || '').replace(/\/$/, '');
  const postUrl = `${root}/api/dope?path=genesis`;
  console.log(`Posting ${list.length} airdrops to ${postUrl} ...`);
  const res = await postJson(postUrl, { airdrops: list });
  console.log('Genesis response:', res);

  // Quick verification
  const addrs = uniqueAddresses(list);
  const balancesUrl = `${root}/api/dope?path=balances`;
  const snap = await getJson(balancesUrl).catch(()=>({}));
  const miners = snap?.miners || {};
  let found = 0; let total = 0;
  for (const a of addrs) {
    const t = Number(miners?.[a]?.total || 0);
    if (t > 0) { found++; total += t; }
  }
  console.log(`Verification: ${found}/${addrs.length} addresses present in balances snapshot (sum=${total}).`);
  if (found < addrs.length) {
    console.log('Tip: some addresses may appear after the server reloads its rewards cache. You can retry balances in a few seconds.');
  }
}

main().catch((e) => { console.error('Airdrop failed:', e?.message || e); process.exit(1); });

