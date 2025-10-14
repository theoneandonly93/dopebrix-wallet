import { Config } from './config.js';

function base() { return Config.get('PROXY_BASE'); }

async function proxyGet(path) {
  const res = await fetch(`${base()}${path}`);
  if (!res.ok) throw new Error(`UniSat proxy ${path} ${res.status}`);
  return res.json();
}

async function proxyPost(path, body) {
  const res = await fetch(`${base()}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error(`UniSat proxy ${path} ${res.status}`);
  return res.json();
}

export const UniSat = {
  // Stubs to a UniSat-like indexer. The server will forward to UNISAT_API_BASE.
  getTrending: () => proxyGet('/unisat/trending'),
  getAddressSummary: (address) => proxyGet(`/unisat/address/${encodeURIComponent(address)}/summary`),
  getUtxos: (address) => proxyGet(`/unisat/address/${encodeURIComponent(address)}/utxo`),
  // Broadcast fallbacks if RPC is not desired
  pushTx: (hex) => proxyPost('/unisat/pushtx', { hex })
};

