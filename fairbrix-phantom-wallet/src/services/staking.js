const base = import.meta.env.VITE_STAKING_API_URL || '';

async function json(res) {
  const t = await res.text();
  try { return JSON.parse(t || '{}'); } catch { return {}; }
}

export async function fetchStakingStats() {
  if (!base) return { total_staked: 0, pool: {}, payouts: [] };
  const r = await fetch(`${base}/pool`).catch(()=>null);
  if (!r || !r.ok) return { total_staked: 0, pool: {}, payouts: [] };
  const data = await json(r);
  // Normalize to expected shape
  return {
    total_staked: Number(data.total_staked || 0),
    pool: data.pool || {},
    payouts: Array.isArray(data.payout_history) ? data.payout_history.slice(-5) : (data.payouts || [])
  };
}

export async function stakeDope(address, amount, height) {
  if (!base) throw new Error('Staking API not configured');
  const r = await fetch(`${base}/stake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amount: Number(amount), current_height: Number(height || 0) })
  });
  return json(r);
}

export async function unstakeDope(address, height) {
  if (!base) throw new Error('Staking API not configured');
  const r = await fetch(`${base}/unstake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, current_height: Number(height || 0) })
  });
  return json(r);
}

export async function claimFbx(address) {
  if (!base) throw new Error('Staking API not configured');
  const r = await fetch(`${base}/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  return json(r);
}

