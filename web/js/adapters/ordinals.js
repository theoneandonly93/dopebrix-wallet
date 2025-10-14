// Ordinals SDK adapter (stubbed). In a production setup, integrate a real SDK.
import { Config } from './config.js';

function base() { return Config.get('PROXY_BASE'); }

export async function createInscription({ address, contentHex, feeRate }) {
  const res = await fetch(`${base()}/ordinals/inscribe`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, contentHex, feeRate })
  });
  if (!res.ok) throw new Error('Ordinals inscribe failed');
  return res.json();
}

