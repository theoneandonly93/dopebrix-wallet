import { store } from '../utils/storage.js';
import { sha256 } from '../utils/crypto.js';

const NS = 'dbx:data';

const DEFAULTS = {
  version: 2,
  account: null, // legacy
  accounts: [], // { id, name, index, address }
  activeAccountId: null,
  tokens: [],
  nfts: [],
};

let state = null;

export function load() {
  if (!state) state = store.get(NS, DEFAULTS);
  // Migrate legacy single account
  if (state.account && (!state.accounts || state.accounts.length===0)) {
    const acc = { id: 'acc1', name: 'Account 1', index: 0, address: state.account.address };
    state.accounts = [acc];
    state.activeAccountId = acc.id;
    delete state.account;
    save();
  }
  return state;
}

export function save() { store.set(NS, state); }

async function deriveAddress(seedHex, index) {
  const h = await sha256(seedHex + ':' + index);
  return 'dbx_' + Array.from(h).slice(0, 8).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function ensureAccount(seedHex) {
  const s = load();
  if (s.accounts && s.accounts.length > 0) return getActiveAccount();
  const addr = await deriveAddress(seedHex, 0);
  const acc = { id: 'acc1', name: 'Account 1', index: 0, address: addr };
  s.accounts = [acc];
  s.activeAccountId = acc.id;
  save();
  return acc;
}

export function listAccounts() { return load().accounts || []; }
export function getActiveAccount() { const s=load(); return (s.accounts||[]).find(a=>a.id===s.activeAccountId) || (s.accounts||[])[0] || null; }
export function setActiveAccount(id) { const s=load(); s.activeAccountId = id; save(); }
export async function addAccount(seedHex, name) { const s=load(); const index = (s.accounts||[]).length; const address = await deriveAddress(seedHex, index); const acc = { id: 'acc'+(index+1), name: name || `Account ${index+1}`, index, address }; s.accounts.push(acc); s.activeAccountId = acc.id; save(); return acc; }

function uid() { return 't_' + Math.random().toString(36).slice(2, 10); }

export function getAccount() { return getActiveAccount(); }

export function listTokens() { return load().tokens.slice().sort((a,b)=>b.createdAt-a.createdAt); }
export function listNFTs() { return load().nfts.slice().sort((a,b)=>b.createdAt-a.createdAt); }

export function getToken(id) { return load().tokens.find(t=>t.id===id); }
export function getNFT(id) { return load().nfts.find(n=>n.id===id); }

export function createToken({ ticker, name, supply, decimals }) {
  const s = load();
  const id = uid();
  // Initialize a pool with nominal liquidity (CPMM)
  const pool = { fbx: 1000, token: supply * 0.1 }; // 10% of supply in pool initially
  const token = { id, ticker, name: name || ticker, supply, decimals, createdAt: Date.now(), pool, trades: [], holders: {} };
  s.tokens.push(token);
  save();
  return token;
}

export function createNFT({ name, contentHex, owner }) {
  const s = load();
  const id = 'n_' + Math.random().toString(36).slice(2, 10);
  const nft = { id, name: name || 'DopeBrix NFT', contentHex, owner, createdAt: Date.now() };
  s.nfts.push(nft);
  save();
  return nft;
}

export function priceOf(token) {
  // CPMM spot price: fbxReserve / tokenReserve (FBX per Token)
  return token.pool.fbx / token.pool.token;
}

export function marketCap(token) {
  const circ = token.supply - token.pool.token; // circulating supply outside the pool
  return priceOf(token) * circ;
}

export function holdersCount(token) { return Object.values(token.holders).filter(v=>v>0).length; }

export function myTokenBalance(token) {
  const acc = getAccount();
  if (!acc) return 0;
  return token.holders[acc.address] || 0;
}

export function buyToken(id, fbxIn) {
  const s = load();
  const t = s.tokens.find(x=>x.id===id);
  if (!t) throw new Error('no token');
  // constant product x*y=k
  const k = t.pool.fbx * t.pool.token;
  const fee = 0.997; // 0.3% fee retained in pool
  const dx = fbxIn * fee;
  const newFbx = t.pool.fbx + dx;
  const newToken = k / newFbx;
  const out = t.pool.token - newToken;
  t.pool.fbx = newFbx;
  t.pool.token = newToken;
  const acc = getAccount();
  t.holders[acc.address] = (t.holders[acc.address] || 0) + out;
  t.trades.push({ ts: Date.now(), side: 'buy', fbx: fbxIn, token: out, price: fbxIn / out });
  save();
  return out;
}

export function sellToken(id, tokenIn) {
  const s = load();
  const t = s.tokens.find(x=>x.id===id);
  if (!t) throw new Error('no token');
  const acc = getAccount();
  if ((t.holders[acc.address] || 0) < tokenIn) throw new Error('insufficient balance');
  const k = t.pool.fbx * t.pool.token;
  const newToken = t.pool.token + tokenIn;
  const newFbx = k / newToken;
  const out = t.pool.fbx - newFbx;
  const feeOut = out * 0.003; // 0.3% taken
  const userOut = out - feeOut;
  t.pool.token = newToken;
  t.pool.fbx = newFbx + feeOut; // keep fee in pool
  t.holders[acc.address] = (t.holders[acc.address] || 0) - tokenIn;
  t.trades.push({ ts: Date.now(), side: 'sell', fbx: userOut, token: tokenIn, price: userOut / tokenIn });
  save();
  return userOut;
}

export function trades24h(token) {
  const since = Date.now() - 24*3600*1000;
  return token.trades.filter(t => t.ts >= since);
}

export function volume24h(token) {
  return trades24h(token).reduce((a,b)=>a+b.fbx, 0);
}

export function topTrendingTokens() {
  return listTokens().sort((a,b)=> volume24h(b) - volume24h(a));
}

export function myHoldings() {
  const acc = getAccount();
  if (!acc) return [];
  return listTokens().filter(t => (t.holders[acc.address]||0) > 0).map(t => ({ token: t, balance: t.holders[acc.address] }));
}
