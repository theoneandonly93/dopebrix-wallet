import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const FILE = path.resolve(process.cwd(), 'doped', 'staking.json');

function safeLoad() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { total_staked: 0, pool: {}, payout_history: [] }; }
}

function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function recomputeTotal(db) {
  db.total_staked = Object.values(db.pool).reduce((a, s) => a + Number(s.amount || 0), 0);
}

app.get('/pool', (_req, res) => {
  const db = safeLoad();
  res.json(db);
});

// Lock DOPE
app.post('/stake', (req, res) => {
  const { address, amount, current_height } = req.body || {};
  if (!address || !(Number(amount) > 0)) return res.status(400).json({ error: 'missing data' });
  const db = safeLoad();
  const lockTime = Number(current_height || 0) + 720; // ~3 days @ 5s
  const prev = db.pool[address] || { amount: 0, locked_until: 0, pending_fbx: 0 };
  db.pool[address] = {
    amount: Number(prev.amount) + Number(amount),
    locked_until: Math.max(Number(prev.locked_until) || 0, lockTime),
    pending_fbx: Number(prev.pending_fbx) || 0,
  };
  recomputeTotal(db);
  save(db);
  res.json({ ok: true, lock_until: db.pool[address].locked_until, total_staked: db.total_staked });
});

// Unlock DOPE
app.post('/unstake', (req, res) => {
  const { address, current_height } = req.body || {};
  const db = safeLoad();
  const s = db.pool[address];
  if (!s) return res.status(404).json({ error: 'not found' });
  if (Number(current_height || 0) < Number(s.locked_until || 0)) return res.status(400).json({ error: 'still locked' });
  delete db.pool[address];
  recomputeTotal(db);
  save(db);
  res.json({ ok: true, total_staked: db.total_staked });
});

// Distribute FBX fees proportionally across stakers
app.post('/payout', (req, res) => {
  const { fbx_total } = req.body || {};
  const total = Number(fbx_total || 0);
  if (!(total > 0)) return res.status(400).json({ error: 'invalid amount' });
  const db = safeLoad();
  const ts = Number(db.total_staked || 0);
  if (!ts) {
    db.payout_history.push({ time: Date.now(), fbx_total: total, distributed: 0 });
    save(db);
    return res.json({ distributed: 0, reason: 'no stakers' });
  }
  const perToken = total / ts;
  Object.entries(db.pool).forEach(([addr, stake]) => {
    const earned = Number(stake.amount || 0) * perToken;
    stake.pending_fbx = Number(stake.pending_fbx || 0) + earned;
  });
  db.payout_history.push({ time: Date.now(), fbx_total: total, distributed: total });
  save(db);
  res.json({ distributed: total });
});

// Claim accrued FBX (this just zeroes pending; paying FBX out is handled elsewhere)
app.post('/claim', (req, res) => {
  const { address } = req.body || {};
  const db = safeLoad();
  const s = db.pool[address];
  if (!s) return res.status(404).json({ error: 'no stake' });
  const claimed = Number(s.pending_fbx || 0);
  s.pending_fbx = 0;
  save(db);
  res.json({ claimed_fbx: claimed });
});

const PORT = Number(process.env.DOPE_STAKING_PORT || 9600);
app.listen(PORT, () => console.log(`🪙 Staking server live on ${PORT}`));
