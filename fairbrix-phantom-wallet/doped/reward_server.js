import express from 'express';
import { mintDopeReward, loadRewards } from './rewards.js';

const app = express();
app.use(express.json());

app.post('/reward', (req, res) => {
  const { miner, txid, amount } = req.body || {};
  if (!miner || !txid) return res.status(400).json({ error: 'Missing miner or txid' });
  const amt = Number(amount) || 0;
  try {
    const r = mintDopeReward(miner, txid, { amount: amt });
    return res.json({ ok: true, total_minted: r.total_minted, miner: r.miners[miner] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'mint failed' });
  }
});

app.get('/rewards', (_req, res) => {
  const r = loadRewards();
  res.json(r);
});

const PORT = Number(process.env.DOPE_REWARD_PORT || 9500);
app.listen(PORT, () => console.log(`💰 Dope reward engine listening on ${PORT}`));

