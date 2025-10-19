const rpcUrl = import.meta.env.VITE_FAIRBRIX_RPC_URL || 'https://fairbrix-phantom-wallet.fly.dev:8645';
const rpcUser = import.meta.env.VITE_FAIRBRIX_RPC_USER || '';
const rpcPass = import.meta.env.VITE_FAIRBRIX_RPC_PASS || '';
// Optional secured proxy (recommended). If unset, prefer web-safe defaults:
// - On localhost dev: use Vite dev proxy at /rpc
// - On web (Vercel, custom domain): use serverless /api/rpc
const __host = (typeof window !== 'undefined') ? String(window.location?.hostname || '') : '';
const defaultProxy = (__host === 'localhost' || __host === '127.0.0.1') ? '/rpc' : (__host ? '/api/rpc' : '');
const proxyUrl = import.meta.env.VITE_FAIRBRIX_PROXY_URL || defaultProxy;
// Broadcast: default to serverless /api/broadcast on web; empty on localhost (RPC fallback sends directly)
const defaultBroadcast = (__host && __host !== 'localhost' && __host !== '127.0.0.1') ? '/api/broadcast' : '';
const broadcastUrl = import.meta.env.VITE_FAIRBRIX_BROADCAST_URL || defaultBroadcast;
const apiToken = import.meta.env.VITE_FAIRBRIX_API_TOKEN || '';
const priceApi = import.meta.env.VITE_PRICE_API_URL || '/api/price';
// Wallet passphrase logic removed: always unlocked for send
// Optional DOPE API for L2 balances (rewards/staking server)
const dopeApi = (import.meta.env.VITE_DOPE_API_URL || import.meta.env.VITE_STAKING_API_URL || '').replace(/\/$/, '');
const priceConst = Number(import.meta.env.VITE_FBX_PRICE_USD || 0);
const WALLET_NAME = import.meta.env.VITE_FAIRBRIX_WALLET_NAME || 'dope';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function classifyErrorMessage(msg = '') {
  const m = String(msg || '').toLowerCase();
  if (!m) return { code: 'unknown', message: 'Unknown error' };
  if (m.includes('unauthorized') || m.includes('401')) return { code: 'unauthorized', message: 'Unauthorized: bad or missing RPC credentials' };
  if (m.includes('proxy http 5') || m.includes('bad gateway') || m.includes('timeout') || m.includes('failed to fetch') || m.includes('networkerror') || m.includes('unreachable')) return { code: 'unreachable', message: 'Node unreachable (network/proxy error)' };
  if (m.includes('method not found')) return { code: 'wallet_disabled', message: 'Node built/started without wallet support' };
  if (m.includes('no wallet') || m.includes('wallet is not loaded') || m.includes('requested wallet does not exist') || m.includes('wallet file not specified')) return { code: 'wallet_unavailable', message: 'No wallet loaded on node' };
  if (m.includes('method not allowed')) return { code: 'method_blocked', message: 'RPC method blocked by proxy' };
  return { code: 'rpc_error', message: msg };
}

async function tryCreateWallet(name) {
  const variants = [
    [name, false, false, '', false, true], // newer
    [name, false, false, '', false],
    [name, false, false, ''],
    [name, false, false],
    [name, false],
    [name], // oldest
  ];
  let lastErr = null;
  for (const args of variants) {
    try {
      await rpcRequest('createwallet', args);
      return true;
    } catch (e) {
      const m = String(e?.message || '').toLowerCase();
      if (m.includes('already') || m.includes('exists')) return true;
      // Some nodes without multiwallet return method not found
      if (m.includes('method not found')) throw new Error('Wallet disabled on node');
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return false;
}

async function tryLoadWallet(name) {
  const variants = [ [name] ];
  let lastErr = null;
  for (const args of variants) {
    try {
      await rpcRequest('loadwallet', args);
      return true;
    } catch (e) {
      const m = String(e?.message || '').toLowerCase();
      if (m.includes('already loaded')) return true;
      if (m.includes('not found') || m.includes('no such file')) { lastErr = e; continue; }
      if (m.includes('method not found')) throw new Error('Wallet disabled on node');
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return false;
}

async function rpcRequest(method, params = []) {
  const id = Math.random().toString(36).slice(2);
  const payload = { jsonrpc: '2.0', id, method, params };

  // If a proxy URL is provided, prefer it (adds caching and JWT auth)
  if (proxyUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
      const res = await fetch(proxyUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      const body = await res.json();
      if (body && typeof body.result !== 'undefined') return body.result;
      if (body && body.error) throw new Error(body.error.message || 'RPC error');
      // Some proxies return full upstream body
      if (body && body.result === undefined && body.id !== undefined) return body.result;
      throw new Error('Invalid proxy response');
    } catch (e) {
      console.warn('Proxy RPC failed, falling back to direct RPC:', e?.message || e);
      // continue to direct RPC fallback
    }
  }

  // Direct-to-node fallback (Basic auth)
  const url = rpcUrl || 'https://fairbrix-phantom-wallet.fly.dev:8645';
  const headers = { 'Content-Type': 'application/json' };
  if (rpcUser || rpcPass) {
    const token = btoa(`${rpcUser}:${rpcPass}`);
    headers['Authorization'] = `Basic ${token}`;
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || 'RPC error');
  return body.result;
}


// Try to ensure a wallet is present and loaded on the node.
async function ensureWallet() {
  try {
    await rpcRequest('getwalletinfo');
    return true;
  } catch (e) {
    const msg = (e && e.message) ? String(e.message) : '';
    const c = classifyErrorMessage(msg);
    if (c.code === 'wallet_disabled') throw new Error('Wallet disabled on node');
    try {
      // Try createwallet if multiwallet is available
      await tryCreateWallet(WALLET_NAME);
      return true;
    } catch (e2) {
      const m2 = (e2 && e2.message) ? String(e2.message) : '';
      const c2 = classifyErrorMessage(m2);
      if (c2.code === 'wallet_disabled') throw new Error('Wallet disabled on node');
      // If it already exists, try loadwallet
      try { await tryLoadWallet(WALLET_NAME); return true; } catch {}
      // As a last resort, some nodes only support a single default wallet; proceed anyway
      return false;
    }
  }
}

async function getBalance() {
  try {
    const bal = await rpcRequest('getbalance');
    return Number(bal) || 0;
  } catch (e) {
    try {
      const info = await rpcRequest('getwalletinfo');
      return Number((info && info.balance) || 0) || 0;
    } catch {
      return 0;
    }
  }
}

async function getOrCreateAddress(label = 'pwa-wallet') {
  try {
    // Make sure a wallet is ready
    await ensureWallet();
  } catch {}
  try {
    const addr = await rpcRequest('getnewaddress', [label]);
    return addr;
  } catch (e) {
    // Try getaddressesbylabel then fallback to create one more time
    try {
      const map = await rpcRequest('getaddressesbylabel', [label]);
      const keys = Object.keys(map || {});
      if (keys && keys.length) return keys[0];
    } catch {}
    // One last attempt after create/load
    try { await ensureWallet(); } catch {}
    try { return await rpcRequest('getnewaddress', [label]); } catch {}
    throw new Error('Failed to get new address. Check RPC credentials and that the wallet is enabled.');
  }
}

async function sendToAddress(address, amount, comment = '') {
  // Ensure wallet is loaded
  try { await tryLoadWallet(WALLET_NAME); } catch (e) { throw new Error('Wallet not loaded: ' + (e?.message || 'unknown')); }
  // Validate recipient address
  const valid = await rpcRequest('validateaddress', [address]);
  if (!valid?.isvalid) throw new Error('Recipient address is invalid');
  // Check funds/UTXOs
  const bal = Number(await rpcRequest('getbalance', []));
  if (Number(amount) > bal) throw new Error('Insufficient funds');
  const utxos = await rpcRequest('listunspent', [0]);
  if (!Array.isArray(utxos) || utxos.length === 0) throw new Error('No spendable UTXOs in wallet. Receive funds first.');
  // Send
  const txid = await rpcRequest('sendtoaddress', [address, amount, comment]);
  return txid;
}

async function importPrivKey(wif, label = 'local', rescan = false) {
  if (!wif) throw new Error('Missing WIF');
  try { await ensureWallet(); } catch {}
  // importprivkey <privkey> (label) (rescan)
  return rpcRequest('importprivkey', [wif, label, !!rescan]);
}

// Validate an address against the node/proxy
async function validateAddress(address) {
  try {
    const res = await rpcRequest('validateaddress', [address]);
    return res || { isvalid: false };
  } catch (e) {
    return { isvalid: false, error: e?.message || 'unavailable' };
  }
}

// Preflight checks before attempting to sign/send
async function preflightSend({ amount = 0, fromAddress = '' } = {}) {
  // Connectivity
  try { await rpcRequest('getblockcount', []); }
  catch (e) { const c = classifyErrorMessage(e?.message || ''); return { ok: false, code: c.code||'unreachable', message: c.message||'Node unreachable' }; }
  // Wallet
  let info;
  try { info = await rpcRequest('getwalletinfo', []); }
  catch (e) { const c = classifyErrorMessage(e?.message || ''); return { ok: false, code: c.code||'wallet_unavailable', message: c.message||'Wallet unavailable' }; }
  // (Wallet lock check removed: always allow send attempt)
  // Funds
  try {
    const bal = Number(info?.balance ?? await rpcRequest('getbalance', [])) || 0;
    const need = Number(amount) || 0;
    if (need > 0 && bal < need) return { ok: false, code: 'insufficient_funds', message: `Insufficient wallet funds (${bal} < ${need})` };
  } catch {}
  // Ownership best-effort
  if (fromAddress) {
    try { const gi = await rpcRequest('getaddressinfo', [fromAddress]); if (gi && gi.ismine === false) return { ok: false, code: 'address_not_owned', message: 'Displayed address is not in the node wallet.' }; } catch {}
  }
  // UTXOs
  try { const utxos = await rpcRequest('listunspent', [0]); if (Array.isArray(utxos) && utxos.length === 0) return { ok: false, code: 'no_utxos', message: 'No spendable UTXOs in wallet. Receive funds first.' }; } catch {}
  return { ok: true };
}

async function stake() {
  // Chain-specific; expose via RPC if supported
  try {
    const r = await rpcRequest('stake', []);
    return { ok: true, message: typeof r === 'string' ? r : 'Stake started' };
  } catch {
    return { ok: false, message: 'Staking not supported on this node' };
  }
}

async function mine() {
  try {
    const r = await rpcRequest('setgenerate', [true, 1]); // Bitcoin-style
    return { ok: true, message: 'Mining requested' };
  } catch {
    return { ok: false, message: 'Mining not supported on this node' };
  }
}

// Swap API (external or your own service). Provide VITE_SWAP_API_URL in .env
const swapUrl = import.meta.env.VITE_SWAP_API_URL || '';
async function getSwapQuote({ from, to, amount }) {
  if (!swapUrl) throw new Error('VITE_SWAP_API_URL missing');
  const res = await fetch(`${swapUrl}/quote?from=${from}&to=${to}&amount=${amount}`);
  if (!res.ok) throw new Error('Quote API error');
  return res.json();
}
async function performSwap({ from, to, amount }) {
  if (!swapUrl) throw new Error('VITE_SWAP_API_URL missing');
  const res = await fetch(`${swapUrl}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, amount })});
  if (!res.ok) throw new Error('Swap API error');
  const data = await res.json();
  if (data && data.redirect) {
    try { window.open(data.redirect, '_blank'); } catch {}
  }
  return data;
}

// Ordinals + Runes APIs (provide compatible gateways via env)
const ordUrl = import.meta.env.VITE_ORDINALS_API_URL || '';
const runesUrl = import.meta.env.VITE_RUNES_API_URL || '';

async function createOrdinalNFT({ name, description, content }) {
  if (!ordUrl) throw new Error('VITE_ORDINALS_API_URL missing');
  const res = await fetch(`${ordUrl}/inscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, description, content }) });
  if (!res.ok) throw new Error('Ordinals API error');
  return res.json();
}

async function createRuneToken({ ticker, supply, decimals }) {
  // If a dedicated Runes API is configured, use it; otherwise, fallback to direct RPC OP_RETURN etch.
  if (runesUrl) {
    const res = await fetch(`${runesUrl}/create`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ticker, supply, decimals }) });
    if (!res.ok) throw new Error('Runes API error');
    return res.json();
  }
  const { runes } = await import('./runes.js');
  return runes.etchRune({ ticker, supply, decimals });
}

// Mint an existing rune (if backend supports it)
async function mintRune({ ticker, amount = 1 }) {
  if (runesUrl) {
    const res = await fetch(`${runesUrl}/mint`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ticker, amount }) });
    if (!res.ok) throw new Error('Runes mint API error');
    return res.json();
  }
  const { runes } = await import('./runes.js');
  return runes.mintRune({ ticker, amount });
}

// Transfer a Rune via OP_RETURN (client-side), or via backend if provided in future.
async function transferRune({ ticker, amount, toAddress, fromAddress }) {
  const { runes } = await import('./runes.js');
  return runes.transferRune({ ticker, amount, toAddress, fromAddress });
}

// Trending from indexer
// Default to public explorer if no env is set
const indexerUrl = import.meta.env.VITE_INDEXER_API_URL || 'https://fairbrixscan.com';
async function getTrending() {
  if (!indexerUrl) return [];
  const res = await fetch(`${indexerUrl}/trending`);
  if (!res.ok) return [];
  return res.json();
}

// "Popular runes" helper – tries a dedicated endpoint, falls back to trending
async function getPopularRunes() {
  // Prefer backend if provided
  try {
    if (runesUrl) {
      const r = await fetch(`${runesUrl}/popular`);
      if (r.ok) return await r.json();
    }
  } catch {}
  // Fallback: scan recent runes locally and rank by activity
  try {
    const { runes } = await import('./runes.js');
    const events = await runes.scanRecentRunes({ lookback: 500 });
    const map = new Map();
    for (const ev of events) {
      const key = (ev.ticker || '').toUpperCase();
      if (!key) continue;
      const cur = map.get(key) || { ticker: key, name: key, number: 0, limitPerMint: 0, mints: 0, transfers: 0, lastTime: 0 };
      if (ev.op === 'ETCH') cur.number += 1;
      if (ev.op === 'MINT') cur.mints += (ev.amount || 1);
      if (ev.op === 'TRANSFER') cur.transfers += 1;
      cur.lastTime = Math.max(cur.lastTime || 0, ev.time || 0);
      map.set(key, cur);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => (b.mints + b.transfers) - (a.mints + a.transfers) || (b.lastTime - a.lastTime));
    return list.slice(0, 100);
  } catch { return []; }
}

// Recent activity from explorer
async function getAddressTxs(address, { start = 0, length = 10 } = {}) {
  if (!address) return [];
  try {
    const url = `/api/indexer?path=${encodeURIComponent(`ext/getaddresstxs/${address}/${start}/${length}`)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data.map((item) => {
      const txid = item.txid || item.hash || item.tx || item.id || '';
      const t = (item.timestamp ?? item.time ?? item.blocktime ?? 0);
      const timeMs = t > 1e12 ? t : (t * 1000);
      const amount = Number(item.amount ?? item.value ?? item.valueOut ?? item.balance ?? 0);
      return { txid, amount, time: new Date(timeMs || Date.now()), raw: item };
    });
  } catch { return []; }
}

// Basic holdings: always include native FBX using RPC balance
async function getHoldings(address) {
  // Start with node wallet balance if available
  let native = 0;
  try { native = Number(await getBalance()) || 0; } catch { native = 0; }
  // If node wallet shows 0/unavailable, and an indexer is configured, try indexer address balance as a fallback
  try {
    if ((!native || native <= 0) && address) {
      const res = await fetch(`/api/indexer?path=${encodeURIComponent(`ext/getaddress/${address}`)}`);
      if (res.ok) {
        const data = await res.json().catch(()=>null);
        if (data && (data.balance !== undefined)) {
          const b = Number(data.balance);
          if (!Number.isNaN(b)) native = b;
        }
      }
    }
  } catch {}

  const list = [ { symbol: 'FBX', name: 'Fairbrix', amount: Number(native) || 0 } ];
  // Try to include DOPE (L2) balance from reward server if configured
  try {
    if (address) {
      const res = await fetch(`/api/dope?path=balances`);
      if (res.ok) {
        const data = await res.json().catch(()=>({}));
        const val = Number(data?.miners?.[address]?.total || 0);
        if (Number.isFinite(val)) list.push({ symbol: 'DOPE', name: 'Dopelganga', amount: val });
      }
    }
  } catch {}
  // Always surface DOPE row even if zero (so users see the token)
  try {
    const hasDope = !!list.find(x=>x.symbol==='DOPE');
    if (!hasDope) list.push({ symbol: 'DOPE', name: 'Dopelganga', amount: 0 });
  } catch {}

  // Try to merge any token balances (best-effort)
  try {
    const { runes } = await import('./runes.js');
    const tokens = await runes.getBalancesForAddress(address);
    if (Array.isArray(tokens)) {
      for (const t of tokens) {
        const ix = list.findIndex(x => x.symbol === t.symbol);
        if (ix >= 0) list[ix].amount += Number(t.amount) || 0;
        else list.push({ symbol: t.symbol, name: t.name || t.symbol, amount: Number(t.amount) || 0 });
      }
    }
  } catch {}
  return list;
}

export const fairbrix = {
  rpcRequest,
  ensureWallet,
  preflightSend,
  async getFbxUsdPrice() {
    if (priceConst && priceConst > 0) return priceConst;
    try {
      const r = await fetch(priceApi);
      if (!r.ok) return 0;
      const j = await r.json().catch(()=>({}));
      const v = Number(j?.usd || 0);
      return Number.isFinite(v) ? v : 0;
    } catch { return 0; }
  },
  async waitForNode({ timeoutMs = 10000, intervalMs = 500 } = {}) {
    const t0 = Date.now();
    // quick probe first
    try { const h = await this.rpcHealth(); if (h?.ok) return true; } catch {}
    while ((Date.now() - t0) < timeoutMs) {
      try { const h = await this.rpcHealth(); if (h?.ok) return true; } catch {}
      await sleep(intervalMs);
    }
    return false;
  },
  /** Quick connectivity check to the node or proxy. */
  async rpcHealth() {
    try {
      const best = await rpcRequest('getblockcount', []);
      return { ok: true, best: Number(best) || 0 };
    } catch (e) {
      const c = classifyErrorMessage(e?.message || '');
      // Fallback to indexer blockcount via serverless proxy (avoids CORS)
      try {
        const res = await fetch(`/api/indexer?path=api/getblockcount`);
        if (res.ok) {
          const txt = await res.text();
          const n = Number(String(txt).trim());
          if (!Number.isNaN(n)) return { ok: true, best: n, via: 'indexer' };
        }
      } catch {}
      return { ok: false, error: c.message, code: c.code };
    }
  },
  /**
   * Diagnose connectivity and wallet availability with friendly messages.
   */
  async diagnose() {
    // Connectivity
    try { await rpcRequest('getblockcount', []); }
    catch (e) { const c = classifyErrorMessage(e?.message || ''); return { ok: false, code: c.code || 'unreachable', message: c.message }; }
    // Wallet availability
    try { await rpcRequest('getwalletinfo', []); return { ok: true, code: 'ok', message: 'Node and wallet available' }; }
    catch (e) {
      const c = classifyErrorMessage(e?.message || '');
      if (c.code === 'wallet_disabled') return { ok: false, code: 'wallet_disabled', message: 'Node wallet is disabled. Start node without -disablewallet or with wallet support.' };
      if (c.code === 'wallet_unavailable') return { ok: false, code: 'wallet_unavailable', message: 'No wallet loaded on node. Use createwallet or loadwallet.' };
      return { ok: false, code: c.code || 'rpc_error', message: c.message };
    }
  },
  getBalance,
  getOrCreateAddress,
  sendToAddress,
  importPrivKey,
  validateAddress,
  /**
   * Transfer DOPE (L2) via reward server. Signs a message with node wallet.
   */
  async transferDope({ toAddress, amount, fromAddress }) {
    const amt = Number(amount) || 0;
    if (!toAddress || !(amt > 0)) throw new Error('Invalid DOPE transfer');
    // Determine from address (node wallet preferred)
    let from = fromAddress || '';
    try { if (!from && typeof localStorage !== 'undefined') from = localStorage.getItem('fbx_addr') || ''; } catch {}
    if (!from) {
      // As a last resort, ask node wallet for a default address (only valid if it matches user's WIF)
      try { await ensureWallet(); } catch {}
      try { from = await rpcRequest('getnewaddress', []); } catch {}
    }
    if (!from) throw new Error('No address available to sign');
    // Compose message
    const ts = Math.floor(Date.now()/1000);
    const message = `DOPE|transfer|${from}|${toAddress}|${amt}|${ts}`;
    // Sign strictly with node wallet
    try { await ensureWallet(); } catch {}
    const signature = await rpcRequest('signmessage', [from, message]).catch(()=>{ throw new Error('Node wallet cannot sign with the selected address'); });
    const res = await fetch('/api/dope?path=transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: toAddress, amount: amt, message, signature }) });
    if (!res.ok) throw new Error(`DOPE transfer HTTP ${res.status}`);
    const body = await res.json().catch(()=>({}));
    if (!body?.ok) throw new Error(body?.error || 'DOPE transfer failed');
    return { ok: true, txid: '', from, to: toAddress };
  },
  async estimatePayment({ address, amount, feeRate }) {
    try {
      await ensureWallet();
      const outputs = {}; outputs[address] = Number(amount);
      const raw = await rpcRequest('createrawtransaction', [[], outputs]);
      const opts = {}; if (feeRate && Number(feeRate) > 0) opts.feeRate = Number(feeRate);
      const funded = await rpcRequest('fundrawtransaction', [raw, opts]);
      const fee = Number((funded && funded.fee) || 0) || 0;
      return { ok: true, fee, total: (Number(amount) || 0) + fee };
    } catch (e) {
      return { ok: false, fee: 0, total: Number(amount) || 0, error: e?.message || 'estimate failed' };
    }
  },
  /**
   * Create a raw transaction paying `amount` to `address`, fund from wallet, sign, and return hex.
   */
  async buildRawPayment({ address, amount, feeRate }) {
    if (!address || !(Number(amount) > 0)) throw new Error('Invalid payment params');
    await ensureWallet();
    // 1) Create raw
    const outputs = {};
    outputs[address] = Number(amount);
    const raw = await rpcRequest('createrawtransaction', [[], outputs]);
    // 2) Fund
    const fundOpts = {};
    if (feeRate && Number(feeRate) > 0) fundOpts.feeRate = Number(feeRate);
    const funded = await rpcRequest('fundrawtransaction', [raw, fundOpts]).catch(async () => ({ hex: raw }));
    // 3) Sign
    const signed = await rpcRequest('signrawtransactionwithwallet', [funded.hex || raw]);
    if (!signed || !signed.complete) throw new Error('Failed to sign raw transaction');
    return signed.hex;
  },
  /**
   * Broadcast a raw tx hex via proxy if configured, otherwise via RPC.
   */
  async broadcastRaw(hex) {
    if (!hex) throw new Error('Missing hex');
    // Prefer configured broadcast URL; otherwise default to dopebrix.com in production
    const bUrl = broadcastUrl || ((typeof window !== 'undefined' && String(window.location?.hostname||'').endsWith('dopebrix.com')) ? 'https://dopebrix.com/api/broadcast' : '');
    if (bUrl) {
      const headers = { 'Content-Type': 'application/json' };
      if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
      const res = await fetch(bUrl, { method: 'POST', headers, body: JSON.stringify({ hex }) });
      if (!res.ok) throw new Error(`Broadcast HTTP ${res.status}`);
      const body = await res.json().catch(()=>({}));
      if (body && body.ok && body.txid) return body.txid;
      if (body && body.error) throw new Error(body.error);
      // fallback to RPC on unexpected body
    }
    // direct RPC
    return rpcRequest('sendrawtransaction', [hex]);
  },
  /**
   * High-level send using proxy broadcast if available.
   */
  async sendPayment(address, amount, feeRate) {
  // Ensure wallet is loaded
  try { await tryLoadWallet(WALLET_NAME); } catch (e) { throw new Error('Wallet not loaded: ' + (e?.message || 'unknown')); }
  // Validate recipient address
  const valid = await rpcRequest('validateaddress', [address]);
  if (!valid?.isvalid) throw new Error('Recipient address is invalid');
  // Check funds/UTXOs
  const bal = Number(await rpcRequest('getbalance', []));
  if (Number(amount) > bal) throw new Error('Insufficient funds');
  const utxos = await rpcRequest('listunspent', [0]);
  if (!Array.isArray(utxos) || utxos.length === 0) throw new Error('No spendable UTXOs in wallet. Receive funds first.');
  // Build and broadcast
  const hex = await this.buildRawPayment({ address, amount, feeRate });
  return this.broadcastRaw(hex);
  },
  stake,
  mine,
  getSwapQuote,
  performSwap,
  createOrdinalNFT,
  createRuneToken,
  transferRune,
  mintRune,
  getTrending,
  getPopularRunes,
  getAddressTxs,
  getHoldings,
};






