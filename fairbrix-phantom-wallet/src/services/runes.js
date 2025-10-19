// Minimal Runes-style layer implemented client-side via Fairbrix RPC.
// Encodes FBXRUNES| messages in OP_RETURN and scans recent blocks.

import { fairbrix } from './fairbrix.js';

const HEADER = 'FBXRUNES|';

function toHex(str) {
  const enc = new TextEncoder();
  return Array.from(enc.encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  try {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function encodeMessage(fields) {
  const parts = [HEADER, `V:1`];
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    parts.push(`${String(k).toUpperCase()}:${String(v)}`);
  });
  return parts.join('|');
}

async function opReturnTx(message, { feeRate } = {}) {
  const hex = toHex(message);
  // 1) Create raw tx with OP_RETURN only. Node will fund+change.
  const raw = await fairbrix.rpcRequest('createrawtransaction', [[], [{ data: hex }]]);
  // 2) Fund it (adds inputs and change). Optionally pass feeRate.
  const fundOpts = {};
  if (feeRate && Number(feeRate) > 0) fundOpts.feeRate = Number(feeRate);
  const funded = await fairbrix.rpcRequest('fundrawtransaction', [raw, fundOpts]);
  // 3) Sign
  const signed = await fairbrix.rpcRequest('signrawtransactionwithwallet', [funded.hex]);
  if (!signed.complete) throw new Error('Failed to sign raw transaction');
  // 4) Broadcast
  const txid = await fairbrix.rpcRequest('sendrawtransaction', [signed.hex]);
  return { txid };
}

async function etchRune({ ticker, supply = 0, decimals = 0, ownerAddress, feeRate } = {}) {
  const owner = ownerAddress || await fairbrix.rpcRequest('getnewaddress', ['runes-owner']);
  const msg = encodeMessage({ op: 'ETCH', ticker, supply, decimals, owner });
  return opReturnTx(msg, { feeRate });
}

async function transferRune({ ticker, amount, toAddress, fromAddress, feeRate } = {}) {
  // Include explicit FROM so scanner can compute debits without UTXO tracking.
  const from = fromAddress || await fairbrix.rpcRequest('getnewaddress', ['runes-from']);
  const msg = encodeMessage({ op: 'TRANSFER', ticker, amount, to: toAddress, from });
  return opReturnTx(msg, { feeRate });
}

async function getBlockVerbose(height) {
  const hash = await fairbrix.rpcRequest('getblockhash', [height]);
  // verbosity=2 returns block + tx decoded
  return fairbrix.rpcRequest('getblock', [hash, 2]);
}

function parseOpReturnFromVout(vout) {
  try {
    if (!vout || !Array.isArray(vout)) return [];
    const out = [];
    for (const o of vout) {
      const spk = o.scriptPubKey || {};
      if (spk.type === 'nulldata' && typeof spk.asm === 'string') {
        const asm = spk.asm;
        const parts = asm.split(' ');
        const idx = parts.indexOf('OP_RETURN');
        const dataHex = idx >= 0 ? parts[idx + 1] : (parts[1] || '');
        if (dataHex) out.push(fromHex(dataHex));
      }
    }
    return out;
  } catch { return []; }
}

function parseRunesMessage(s) {
  if (typeof s !== 'string' || !s.startsWith(HEADER)) return null;
  const fields = s.split('|').slice(1); // drop header
  const out = {};
  for (const f of fields) {
    const i = f.indexOf(':');
    if (i === -1) continue;
    const k = f.slice(0, i).toLowerCase();
    const v = f.slice(i + 1);
    out[k] = v;
  }
  return out;
}

async function scanRecentRunes({ lookback = 50 } = {}) {
  const tip = await fairbrix.rpcRequest('getblockcount');
  const start = Math.max(0, tip - lookback + 1);
  const events = [];
  for (let h = tip; h >= start; h--) {
    try {
      const blk = await getBlockVerbose(h);
      const time = (blk.time || 0) * 1000;
      for (const tx of (blk.tx || [])) {
        const msgs = parseOpReturnFromVout(tx.vout);
        for (const m of msgs) {
          const parsed = parseRunesMessage(m);
          if (!parsed) continue;
          const op = (parsed.op || '').toUpperCase();
          const ev = {
            op,
            ticker: parsed.ticker,
            supply: parsed.supply ? Number(parsed.supply) : undefined,
            decimals: parsed.decimals ? Number(parsed.decimals) : undefined,
            owner: parsed.owner,
            from: parsed.from,
            to: parsed.to,
            amount: parsed.amount ? Number(parsed.amount) : undefined,
            txid: tx.txid,
            height: h,
            time,
            raw: parsed,
          };
          events.push(ev);
        }
      }
    } catch {
      // ignore individual failures, continue
    }
  }
  events.sort((a, b) => (b.height - a.height) || (b.time - a.time));
  return events;
}

async function getBalancesForAddress(address, { lookback = 200 } = {}) {
  const evs = await scanRecentRunes({ lookback });
  const balances = new Map(); // key: ticker, value: amount
  for (const ev of evs) {
    const sym = (ev.ticker || '').toUpperCase();
    if (!sym) continue;
    const cur = balances.get(sym) || 0;
    if (ev.op === 'ETCH' && ev.owner === address) {
      balances.set(sym, cur + (Number(ev.supply) || 0));
    }
    if (ev.op === 'TRANSFER') {
      if (ev.to === address) balances.set(sym, cur + (Number(ev.amount) || 0));
      if (ev.from === address) balances.set(sym, cur - (Number(ev.amount) || 0));
    }
  }
  const out = [];
  for (const [symbol, amount] of balances.entries()) {
    if (!amount) continue;
    out.push({ symbol, name: symbol, amount });
  }
  return out;
}

export const runes = {
  etchRune,
  async mintRune({ ticker, amount = 1, toAddress, feeRate } = {}) {
    const to = toAddress || await fairbrix.rpcRequest('getnewaddress', ['runes-mint']);
    const msg = encodeMessage({ op: 'MINT', ticker, amount, to });
    return opReturnTx(msg, { feeRate });
  },
  transferRune,
  scanRecentRunes,
  getBalancesForAddress,
};
