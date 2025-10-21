// Handle airdrop genesis POST
app.post('/api/dope', async (req, res) => {
  if (req.query.path === 'genesis') {
    try {
      // You may want to validate req.body here
      // Example: process airdrop payload
      console.log('Received airdrop genesis:', req.body);
      // TODO: Add your airdrop processing logic here
      res.json({ status: 'success', received: req.body });
    } catch (err) {
      console.error('Airdrop genesis error:', err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(404).send('Unknown path');
  }
});
// doped/reward_server_hardened.js
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
const DOPE_TAG = process.env.DOPE_COMMIT_TAG || '444F5045'; // 'DOPE' hex
const FAIRBRIX_PROXY = (process.env.FAIRBRIX_PROXY_URL || '').replace(/\/$/, '');
const FAIRBRIX_RPC = FAIRBRIX_PROXY ? `${FAIRBRIX_PROXY}` : (process.env.FAIRBRIX_RPC_URL || 'http://127.0.0.1:8645');
const CONFIRMATIONS_REQUIRED = parseInt(process.env.CONFIRMATIONS_REQUIRED || '1', 10);
const HMAC_SECRET = process.env.HMAC_SECRET || '';
const DOPE_REWARD = Number(process.env.DOPE_REWARD || 10);

// ---- helpers ----
function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
function loadRewards() {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(REWARDS_FILE, 'utf8')); }
  catch { return { total_minted: 0, miners: {} }; }
}
function saveRewards(r) { ensureDir(); fs.writeFileSync(REWARDS_FILE, JSON.stringify(r, null, 2)); }

function verifyHmac(req) {
  if (!HMAC_SECRET) return true; // allow open if unset
  const sig = req.headers['x-signature'];
  if (!sig) return false;
  const body = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

async function rpc(method, params = []) {
  const payload = { jsonrpc: '1.0', id: Math.random().toString(36).slice(2), method, params };
  const res = await fetch(FAIRBRIX_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

async function getTxData(txid) { return rpc('getrawtransaction', [txid, true]); }
async function getBlockCount() { return rpc('getblockcount', []); }

async function verifyCommit(txid, expectedPrefix) {
  const tx = await getTxData(txid);
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
  const r = loadRewards();
  if (!r.miners[miner]) r.miners[miner] = { total: 0, last_commit: '' };
  r.miners[miner].total += DOPE_REWARD;
  r.miners[miner].last_commit = txid;
  r.total_minted += DOPE_REWARD;
  saveRewards(r);
  try { fs.appendFileSync(COMMITS_FILE, JSON.stringify({ txid, miner, fbxFee: Number(fbxFee)||0, time: Date.now() }) + '\n'); } catch {}
  return r;
}

// ---- secured endpoint ----
app.post('/reward', async (req, res) => {
  try {
    if (!verifyHmac(req)) return res.status(403).json({ error: 'bad signature' });
    const { miner, txid, fbx_fee } = req.body || {};
    if (!miner || !txid) return res.status(400).json({ error: 'missing miner or txid' });
    const status = await verifyCommit(txid, DOPE_TAG);
    if (status === 'pending') return res.status(202).json({ ok: false, msg: 'waiting for confirmations' });
    if (!status) return res.status(400).json({ error: 'commit verification failed' });
    mintReward(miner, txid, fbx_fee || 0);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'server error' });
  }
});

// ---- read endpoints ----
app.get('/balances', (req, res) => { res.json(loadRewards()); });
app.get('/history/:miner', (req, res) => {
  const miner = req.params.miner;
  let commits = [];
  try {
    commits = fs.existsSync(COMMITS_FILE) ? fs.readFileSync(COMMITS_FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(c => c.miner === miner) : [];
  } catch {}
  res.json({ miner, commits });
});

const PORT = Number(process.env.REWARD_PORT || 9500);
app.listen(PORT, () => console.log(`💸 Hardened Reward server listening on :${PORT}`));

