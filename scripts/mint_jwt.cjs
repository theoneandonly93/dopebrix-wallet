#!/usr/bin/env node
const crypto = require('crypto');

const secret = process.argv[2] || process.env.API_JWT_SECRET || '';
if (!secret) {
  console.error('Usage: node scripts/mint_jwt.cjs <secret>');
  process.exit(1);
}

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 86400 * 180; // 180 days
const payload = Buffer.from(JSON.stringify({ iss: 'dopebrix', exp })).toString('base64url');
const data = `${header}.${payload}`;
const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
console.log(`${data}.${sig}`);

