// doped/reward_server_auto.js
import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || undefined });

const app = express();
app.use(express.json());

const DATA_DIR = 'doped';
const REWARDS_FILE = `${DATA_DIR}/rewards.json`;
const COMMITS_FILE = `${DATA_DIR}/commits_log.json`;
const PENDING_FILE = `${DATA_DIR}/pending_commits.json`;
const TRANSFERS_FILE = `${DATA_DIR}/transfers_log.json`;
const NONCES_FILE = `${DATA_DIR}/used_nonces.json`;
const DOPE_TAG = process.env.DOPE_COMMIT_TAG || '444F5045'; // 'DOPE' hex
const FAIRBRIX_PROXY = (process.env.FAIRBRIX_PROXY_URL || '').replace(/\/$/, '');
const FAIRBRIX_RPC = FAIRBRIX_PROXY ? `${FAIRBRIX_PROXY}` : (process.env.FAIRBRIX_RPC_URL || 'http://127.0.0.1:8645');
const CONFIRMATIONS_REQUIRED = parseInt(process.env.CONFIRMATIONS_REQUIRED || '1', 10);
const HMAC_SECRET = process.env.HMAC_SECRET || '';
const DOPE_REWARD = Number(process.env.DOPE_REWARD || 10);
const RECHECK_MS = Number(process.env.RECHECK_INTERVAL_MS || 60_000);

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
function loadJson(path, fallback) { try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return fallback; } }
function saveJson(path, data) { ensureDir(); fs.writeFileSync(path, JSON.stringify(data, null, 2)); }

function verifyHmac(req) {
  if (!HMAC_SECRET) return true; // allow dev if unset
  const sig = req.headers['x-signature'];
  if (!sig) return false;
  const body = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

async function rpc(method, params = []) {
  const payload = { jsonrpc: '1.0', id: method, method, params };
  const res = await fetch(FAIRBRIX_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

async function verifyCommit(txid, expectedPrefix) {
  const tx = await rpc('getrawtransaction', [txid, true]);
  if (!tx?.vout) return false;
  for (const v of tx.vout) {
    const asm = v?.scriptPubKey?.asm || '';
    if (asm.includes('OP_RETURN')) {
      const hex = (asm.split(' ')[1] || '').toUpperCase();
      if (hex.startsWith(String(expectedPrefix).toUpperCase())) {
        const confs = Number(tx.confirmations || 0);
        if (confs < CONFIRMATIONS_REQUIRED) return 'pending';
        return true;
      }
    }
  }
  return false;
}

function mintReward(miner, txid, fbxFee) {
  const r = loadJson(REWARDS_FILE, { total_minted: 0, miners: {} });
  if (!r.miners[miner]) r.miners[miner] = { total: 0, last_commit: '' };
  r.miners[miner].total += DOPE_REWARD;
  r.miners[miner].last_commit = txid;
  r.total_minted += DOPE_REWARD;
  saveJson(REWARDS_FILE, r);
  try { fs.appendFileSync(COMMITS_FILE, JSON.stringify({ txid, miner, fbxFee: Number(fbxFee)||0, time: Date.now() }) + '\n'); } catch {}
}

function addPending(miner, txid, fbxFee) {
  const list = loadJson(PENDING_FILE, []);
  if (!list.find(x => x.txid === txid)) { list.push({ miner, txid, fbxFee }); saveJson(PENDING_FILE, list); }
}
function removePending(txid) { const list = loadJson(PENDING_FILE, []); saveJson(PENDING_FILE, list.filter(x => x.txid !== txid)); }

// ---- endpoints ----
app.post('/reward', async (req, res) => {
  try {
    if (!verifyHmac(req)) return res.status(403).json({ error: 'bad signature' });
    const { miner, txid, fbx_fee } = req.body || {};
    if (!miner || !txid) return res.status(400).json({ error: 'missing miner or txid' });
    const status = await verifyCommit(txid, DOPE_TAG);
    if (status === 'pending') { addPending(miner, txid, fbx_fee || 0); return res.status(202).json({ ok: false, msg: 'waiting for confirmations' }); }
    if (!status) return res.status(400).json({ error: 'commit verification failed' });
    mintReward(miner, txid, fbx_fee || 0);
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ error: e?.message || 'server error' }); }
});

// Pending list (for UI)
app.get('/pending', (req, res) => { res.json(loadJson(PENDING_FILE, [])); });
app.get('/balances', (req, res) => { res.json(loadJson(REWARDS_FILE, { total_minted: 0, miners: {} })); });
app.get('/history/:miner', (req, res) => {
  const miner = req.params.miner;
  let commits = [];
  try {
    commits = fs.existsSync(COMMITS_FILE) ? fs.readFileSync(COMMITS_FILE, 'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(c=>c.miner===miner) : [];
  } catch {}
  res.json({ miner, commits });
});

// Off-chain DOPE transfer: requires HMAC and a verifymessage signature
// Body: { from, to, amount, message, signature }
app.post('/transfer', async (req, res) => {
  try {
    if (!verifyHmac(req)) return res.status(403).json({ error: 'bad signature' });
    const { from, to, amount, message, signature } = req.body || {};
    const amt = Number(amount);
    if (!from || !to || !(amt > 0) || !message || !signature) return res.status(400).json({ error: 'missing fields' });
    const parts = String(message||'').split('|');
    if (parts.length !== 6 || parts[0] !== 'DOPE' || parts[1] !== 'transfer' || parts[2] !== from || parts[3] !== to || Number(parts[4]) !== amt) {
      return res.status(400).json({ error: 'bad message' });
    }
    const ts = Number(parts[5]);
    if (!Number.isFinite(ts)) return res.status(400).json({ error: 'bad timestamp' });
    const now = Math.floor(Date.now()/1000);
    if (Math.abs(now - ts) > 600) return res.status(400).json({ error: 'stale request' });
    const used = loadJson(NONCES_FILE, {});
    const sigKey = crypto.createHash('sha256').update(signature).digest('hex');
    if (used[sigKey]) return res.status(409).json({ error: 'duplicate' });
    const ok = await rpc('verifymessage', [from, signature, message]).catch(()=>false);
    if (!ok) return res.status(400).json({ error: 'verification failed' });
    const r = loadJson(REWARDS_FILE, { total_minted: 0, miners: {} });
    if (!r.miners[from] || (r.miners[from].total||0) < amt) return res.status(400).json({ error: 'insufficient balance' });
    if (!r.miners[to]) r.miners[to] = { total: 0, last_commit: '' };
    r.miners[from].total -= amt;
    r.miners[to].total += amt;
    saveJson(REWARDS_FILE, r);
    used[sigKey] = { time: Date.now(), from, to, amount: amt };
    saveJson(NONCES_FILE, used);
    try { fs.appendFileSync(TRANSFERS_FILE, JSON.stringify({ time: Date.now(), from, to, amount: amt, message }) + '\n'); } catch {}
    return res.json({ ok: true, fromBalance: r.miners[from].total, toBalance: r.miners[to].total });
  } catch (e) { return res.status(500).json({ error: e?.message || 'server error' }); }
});

// Protected genesis distribution: { airdrops: [{ address, amount }] }
app.post('/genesis', (req, res) => {
  try {
    if (!verifyHmac(req)) return res.status(403).json({ error: 'bad signature' });
    const airdrops = Array.isArray(req.body?.airdrops) ? req.body.airdrops : [];
    if (!airdrops.length) return res.status(400).json({ error: 'empty airdrop' });
    const r = loadJson(REWARDS_FILE, { total_minted: 0, miners: {} });
    for (const { address, amount } of airdrops) {
      const addr = String(address||'').trim();
      const amt = Number(amount)||0;
      if (!addr || !(amt>0)) continue;
      if (!r.miners[addr]) r.miners[addr] = { total: 0, last_commit: '' };
      r.miners[addr].total += amt;
      r.total_minted += amt;
    }
    saveJson(REWARDS_FILE, r);
    return res.json({ ok: true, total_minted: r.total_minted });
  } catch (e) { return res.status(500).json({ error: e?.message || 'server error' }); }
});

async function recheckPending() {
  const list = loadJson(PENDING_FILE, []);
  if (!Array.isArray(list) || !list.length) return;
  for (const c of list) {
    try {
      const status = await verifyCommit(c.txid, DOPE_TAG);
      if (status === true) { mintReward(c.miner, c.txid, c.fbxFee || 0); removePending(c.txid); }
    } catch {}
  }
}
setInterval(recheckPending, RECHECK_MS);

const PORT = Number(process.env.REWARD_PORT || 9500);
app.listen(PORT, () => console.log(`💸 Auto Reward server running on :${PORT}`));
