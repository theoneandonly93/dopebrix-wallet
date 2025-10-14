// Runes SDK adapter (stubbed)
import { Config } from './config.js';

function base() { return Config.get('PROXY_BASE'); }

export async function createRune({ ticker, supply, decimals, creatorAddress, feeRate }) {
  const res = await fetch(`${base()}/runes/create`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticker, supply, decimals, creatorAddress, feeRate })
  });
  if (!res.ok) throw new Error('Runes create failed');
  return res.json();
}

