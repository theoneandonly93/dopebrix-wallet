// Premine split helper
// Usage:
//   node doped/premine_split.js [--force] [--genesis doped/genesis.json]
// Reads a genesis JSON with token.premine.allocations and writes doped/rewards.json
// compatible with the wallet/rewards readers in this repo.

import fs from 'node:fs';
import path from 'node:path';

const CWD = process.cwd();
const DATA_DIR = path.resolve(CWD, 'doped');
const OUT = path.join(DATA_DIR, 'rewards.json');

function parseArgs(argv) {
  const out = { force: false, genesis: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a === '--genesis') { out.genesis = argv[++i] || ''; }
  }
  return out;
}

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJson(fp, obj) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
}

function findGenesis(def) {
  const candidates = [
    def,
    path.resolve(DATA_DIR, 'genesis.json'),
    path.resolve(CWD, 'genesis.json'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch {}
  }
  return '';
}

function toNumber(x) {
  const n = typeof x === 'string' ? Number(x) : x;
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const { force, genesis: gArg } = parseArgs(process.argv);
  const gPath = findGenesis(gArg);
  if (!gPath) {
    console.error('genesis.json not found. Pass --genesis path/to/genesis.json');
    process.exit(1);
  }
  if (fs.existsSync(OUT) && !force) {
    console.error(`Refusing to overwrite ${OUT}. Pass --force to override.`);
    process.exit(2);
  }

  const g = readJson(gPath);
  const allocations = g?.token?.premine?.allocations;
  if (!Array.isArray(allocations) || allocations.length === 0) {
    console.error('No token.premine.allocations array in genesis');
    process.exit(3);
  }

  const rewards = { total_minted: 0, miners: {} };
  for (const a of allocations) {
    const addr = String(a.address || '').trim();
    const amt = toNumber(a.amount);
    if (!addr || !(amt > 0)) continue;
    rewards.miners[addr] = { total: amt, last_commit: 'genesis' };
    rewards.total_minted += amt;
    console.log(`💎 Minted ${amt} DOPE to ${addr}`);
  }

  writeJson(OUT, rewards);
  console.log(`✅ Premine distribution written to ${OUT}`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });

