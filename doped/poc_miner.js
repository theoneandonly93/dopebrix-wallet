// Dope L2 Proof-of-Commit miner over Fairbrix
// Builds real OP_RETURN commits using Fairbrix JSON-RPC or the /api proxy.

import fs from 'node:fs';
import crypto from 'node:crypto';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { mintDopeReward } from './rewards.js';

const genesis = JSON.parse(fs.readFileSync(new URL('./genesis.json', import.meta.url)));

// Env: prefer serverless proxy for mobile/web-style deployments
// Examples:
//  - FAIRBRIX_PROXY_URL=https://your-app.vercel.app/api/rpc
//  - FAIRBRIX_BROADCAST_URL=https://your-app.vercel.app/api/broadcast
//  - FAIRBRIX_API_TOKEN=Bearer <jwt>
// Or direct node:
//  - FAIRBRIX_RPC_URL=http://127.0.0.1:8645, FAIRBRIX_RPC_USER, FAIRBRIX_RPC_PASS
const PROXY_URL = process.env.FAIRBRIX_PROXY_URL || process.env.VITE_FAIRBRIX_PROXY_URL || '';
const BROADCAST_URL = process.env.FAIRBRIX_BROADCAST_URL || process.env.VITE_FAIRBRIX_BROADCAST_URL || '';
const API_TOKEN = process.env.FAIRBRIX_API_TOKEN || process.env.VITE_FAIRBRIX_API_TOKEN || '';

const RPC_URL = process.env.FAIRBRIX_RPC_URL || process.env.VITE_FAIRBRIX_RPC_URL || 'http://127.0.0.1:8645';
const RPC_USER = process.env.FAIRBRIX_RPC_USER || process.env.VITE_FAIRBRIX_RPC_USER || '';
const RPC_PASS = process.env.FAIRBRIX_RPC_PASS || process.env.VITE_FAIRBRIX_RPC_PASS || '';

// Key + network for PSBT signing
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const FAIRBRIX_NETWORK = (process.env.FAIRBRIX_NETWORK || 'mainnet').toLowerCase();
const network = FAIRBRIX_NETWORK === 'testnet' ? bitcoin.networks.testnet : {
  messagePrefix: '\x18Fairbrix Signed Message:\n',
  bech32: 'fbx',
  bip32: { public: 0x0488b21e, private: 0x0488ade4 },
  pubKeyHash: 0x23, // adjust if your chain differs
  scriptHash: 0x05,
  wif: 0x80,
};

const FROM_WIF = process.env.FAIRBRIX_WIF || '';
const FROM_ADDR = process.env.FAIRBRIX_FROM_ADDR || '';
const ECP = FROM_WIF ? ECPair.fromWIF(FROM_WIF, network) : null;

const COMMIT_INTERVAL = Number(genesis.params.commit_interval || 10);
const BLOCK_TIME_MS = Number(genesis.block_time_seconds || 5) * 1000;
const ANCHOR_TAG = String(genesis.params.anchor_tag_hex || '444F5045'); // 'DOPE'
const REWARD_PER_BLOCK = Number(genesis.params.reward_per_block || 0);
const DOPE_MINER_ADDR = process.env.DOPE_MINER_ADDR || process.env.DOPER_MINER_ADDR || '';

let height = 0;
const chain = [];

function hexConcat(a, b) { return String(a || '') + String(b || ''); }

async function rpc(method, params = []) {
  const id = Math.random().toString(36).slice(2);
  const payload = { jsonrpc: '2.0', id, method, params };
  // Prefer proxy if present
  if (PROXY_URL) {
    const headers = { 'Content-Type': 'application/json' };
    if (API_TOKEN) headers['Authorization'] = API_TOKEN.startsWith('Bearer') ? API_TOKEN : `Bearer ${API_TOKEN}`;
    const url = PROXY_URL.endsWith('/rpc') ? PROXY_URL : PROXY_URL.replace(/\/$/, '') + '/rpc';
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`Proxy HTTP ${r.status}`);
    const body = await r.json();
    if (body?.error) throw new Error(body.error?.message || 'RPC error');
    return body.result;
  }
  // Direct-to-node
  const headers = { 'Content-Type': 'application/json' };
  if (RPC_USER || RPC_PASS) {
    const basic = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }
  const r = await fetch(RPC_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  const body = await r.json();
  if (body?.error) throw new Error(body.error?.message || 'RPC error');
  return body.result;
}

async function ensureWallet(walletName = process.env.FAIRBRIX_WALLET_NAME || 'dope') {
  try { await rpc('getwalletinfo'); return true; } catch {}
  try {
    await rpc('createwallet', [walletName, false, false, '', false, true]);
    return true;
  } catch (e) {
    const msg = String(e?.message || '').toLowerCase();
    if (msg.includes('already')) {
      try { await rpc('loadwallet', [walletName]); return true; } catch {}
    }
  }
  return false;
}

async function getUtxos(address) {
  // listunspent (minconf=0) and fetch raw tx for nonWitnessUtxo
  const unspent = await rpc('listunspent', [0, 9999999, [address]]);
  const utxos = [];
  for (const u of (unspent || [])) {
    const raw = await rpc('getrawtransaction', [u.txid]);
    utxos.push({ txid: u.txid, vout: u.vout, amount: Number(u.amount), hex: raw });
  }
  return utxos;
}

async function buildOpReturnTx(payloadHex) {
  if (!ECP || !FROM_ADDR) throw new Error('Missing FAIRBRIX_WIF or FAIRBRIX_FROM_ADDR');
  const utxos = await getUtxos(FROM_ADDR);
  if (!utxos || !utxos.length) throw new Error('No UTXOs to spend');

  const utxo = utxos[0];
  const utxoSats = Math.floor(utxo.amount * 1e8);
  const feeSats = 1000; // tune later
  const changeSats = utxoSats - feeSats;
  if (changeSats <= 0) throw new Error('Insufficient funds for fee');

  const psbt = new bitcoin.Psbt({ network });
  const data = Buffer.from(payloadHex, 'hex');
  const embed = bitcoin.payments.embed({ data: [data] });

  psbt.addInput({ hash: utxo.txid, index: utxo.vout, nonWitnessUtxo: Buffer.from(utxo.hex, 'hex') });
  psbt.addOutput({ script: embed.output, value: 0 });
  psbt.addOutput({ address: FROM_ADDR, value: changeSats });

  psbt.signAllInputs(ECP);
  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
}

async function broadcastHex(hex) {
  if (BROADCAST_URL) {
    const headers = { 'Content-Type': 'application/json' };
    if (API_TOKEN) headers['Authorization'] = API_TOKEN.startsWith('Bearer') ? API_TOKEN : `Bearer ${API_TOKEN}`;
    const url = BROADCAST_URL.endsWith('/broadcast') ? BROADCAST_URL : BROADCAST_URL.replace(/\/$/, '') + '/broadcast';
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ hex }) });
    const body = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(body?.error || `Broadcast HTTP ${r.status}`);
    return body?.txid || '';
  }
  return rpc('sendrawtransaction', [hex]);
}

function createBlock() {
  const prevHash = height > 0 ? chain[height - 1].hash : '0'.repeat(64);
  const data = `Block #${height + 1} @ ${new Date().toISOString()}`;
  const hash = crypto.createHash('sha256').update(prevHash + data).digest('hex');
  const block = { height: height + 1, prevHash, data, hash };
  chain.push(block);
  height++;
  console.log(`🧱 Dope block #${height} mined: ${hash.slice(0, 16)}...`);
  return block;
}

async function commitToFairbrix(block) {
  // Anchor payload = ANCHOR_TAG + block.hash
  const payload = hexConcat(ANCHOR_TAG, block.hash);
  console.log(`📡 Anchoring block #${block.height} to Fairbrix…`);
  try {
    await ensureWallet();
    const hex = await buildOpReturnTx(payload);
    const txid = await broadcastHex(hex);
    console.log('✅ Commit TXID:', txid);
    // Wait for confirmation, then mint reward
    if (txid) {
      const confirmed = await waitForConfirmation(txid, { timeoutMs: 10 * 60_000, intervalMs: 10_000 });
      if (confirmed) {
        const rewardAmt = REWARD_PER_BLOCK * COMMIT_INTERVAL;
        const addr = DOPE_MINER_ADDR || FROM_ADDR || 'unknown';
        try {
          mintDopeReward(addr, txid, { amount: rewardAmt });
          console.log(`💸 Minted ${rewardAmt} DOPE to ${addr} for commit ${txid}`);
        } catch (e) {
          console.error('Reward mint failed:', e?.message || e);
        }
      } else {
        console.warn('Commit not confirmed within timeout; skipping reward for now');
      }
    }
  } catch (e) {
    console.error('❌ Commit failed:', e?.message || e);
  }
}

async function waitForNode({ timeoutMs = 15000, intervalMs = 600 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const best = await rpc('getblockcount', []); if (Number(best) >= 0) return true; } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

async function waitForConfirmation(txid, { timeoutMs = 300000, intervalMs = 5000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      // Some nodes support verbose=1 returning a blockhash if confirmed
      const raw = await rpc('getrawtransaction', [txid, 1]);
      if (raw && (raw.blockhash || raw.confirmations > 0)) return true;
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

async function runLoop() {
  const ok = await waitForNode();
  if (!ok) {
    console.error('Fairbrix RPC unreachable. Check node/proxy env.');
    process.exit(1);
  }
  await ensureWallet();
  // Simple block engine that anchors every N blocks
  // Replace with your production consensus engine later.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const block = createBlock();
    if (block.height % COMMIT_INTERVAL === 0) {
      await commitToFairbrix(block);
    }
    await new Promise(r => setTimeout(r, BLOCK_TIME_MS));
  }
}

runLoop().catch(e => { console.error(e); process.exit(1); });
