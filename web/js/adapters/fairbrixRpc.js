import { Config } from './config.js';

async function proxyFetch(path, body) {
  const base = Config.get('PROXY_BASE');
  // Pass optional RPC URL/auth for this session
  const rpcUrl = Config.get('FAIRBRIX_RPC_URL');
  const rpcAuth = Config.get('FAIRBRIX_RPC_AUTH');
  const headers = { 'content-type': 'application/json' };
  if (rpcUrl) headers['x-dbx-rpc-url'] = rpcUrl;
  if (rpcAuth) headers['x-dbx-rpc-auth'] = rpcAuth;
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(`Proxy ${path} ${res.status}`);
  return res.json();
}

export async function rpcCall(method, params = []) {
  const id = `dbx-${Date.now()}`;
  const { result, error } = await proxyFetch('/rpc', { jsonrpc: '1.0', id, method, params });
  if (error) throw new Error(error.message || 'RPC error');
  return result;
}

export async function getBlockchainInfo() {
  return rpcCall('getblockchaininfo');
}

export async function broadcastRawTransaction(hex) {
  return rpcCall('sendrawtransaction', [hex]);
}

export async function createAndSendSimple(toAddress, amountFBX) {
  // Requires wallet RPC enabled
  const addr = toAddress;
  const res = await rpcCall('sendtoaddress', [addr, amountFBX]);
  return res; // txid
}

export async function getNewAddress(label = 'DopeBrix', type = 'bech32') {
  return rpcCall('getnewaddress', [label, type]);
}

export async function listUnspent(addresses, minconf = 0, maxconf = 9999999) {
  // Bitcoin Core API: listunspent(minconf, maxconf, [addresses])
  return rpcCall('listunspent', [minconf, maxconf, addresses]);
}

export async function getWalletInfo() { return rpcCall('getwalletinfo'); }
export async function getBalances() { return rpcCall('getbalances'); }
