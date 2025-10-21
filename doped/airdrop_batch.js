// Usage: node doped/airdrop_batch.js
// This script will POST each airdrop entry to the /reward endpoint of your reward server

import fs from 'fs';
import fetch from 'node-fetch';
import crypto from 'crypto';

const AIRDROP_FILE = 'doped/airdrops.json';
const REWARD_URL = 'http://localhost:9500/reward'; // Change to your server URL if needed
const BEARER_TOKEN = process.env.DOPE_API_TOKEN || '';

const airdrops = JSON.parse(fs.readFileSync(AIRDROP_FILE, 'utf8')).airdrops;

async function sendAirdrop({ address, amount }) {
  const txid = crypto.randomBytes(16).toString('hex');
  const body = { miner: address, txid, amount };
  const res = await fetch(REWARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BEARER_TOKEN ? { 'Authorization': `Bearer ${BEARER_TOKEN}` } : {})
    },
    body: JSON.stringify(body)
  });
  const result = await res.json();
  if (!result.ok) {
    console.error(`Failed for ${address}:`, result);
  } else {
    console.log(`Airdropped ${amount} to ${address}`);
  }
}

(async () => {
  for (const entry of airdrops) {
    await sendAirdrop(entry);
  }
  console.log('Airdrop batch complete.');
})();
