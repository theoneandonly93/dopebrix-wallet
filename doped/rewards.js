import fs from 'node:fs';
import path from 'node:path';

const REWARDS_PATH = path.resolve(process.cwd(), 'doped', 'rewards.json');

export function loadRewards() {
  try { return JSON.parse(fs.readFileSync(REWARDS_PATH, 'utf8')); }
  catch { return { total_minted: 0, miners: {} }; }
}

export function saveRewards(r) {
  fs.writeFileSync(REWARDS_PATH, JSON.stringify(r, null, 2));
}

export function mintDopeReward(minerAddr, commitTxid, { amount }) {
  if (!minerAddr) throw new Error('Missing miner address');
  const r = loadRewards();
  if (!r.miners[minerAddr]) r.miners[minerAddr] = { total: 0, last_commit: '' };
  r.miners[minerAddr].total += Number(amount) || 0;
  r.miners[minerAddr].last_commit = commitTxid || '';
  r.total_minted += Number(amount) || 0;
  saveRewards(r);
  return r;
}

