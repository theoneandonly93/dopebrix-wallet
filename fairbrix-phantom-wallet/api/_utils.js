// Vercel Node.js serverless utils (ESM)
import crypto from 'node:crypto';

function matchOrigin(origin, allowList) {
  for (const raw of allowList) {
    const pat = (raw || '').trim();
    if (!pat) continue;
    if (pat === '*') return '*';
    if (pat === origin) return origin;
    if (pat.includes('*')) {
      const esc = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      try {
        const re = new RegExp('^' + esc + '$');
        if (re.test(origin)) return origin;
      } catch {}
    }
  }
  return '';
}

export function corsHeaders(origin) {
  const allowList = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const matched = allowList.length ? matchOrigin(origin || '*', allowList) : '';
  const allow = matched || (allowList.length ? allowList[0] : '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function ok(res, data, origin) {
  const h = corsHeaders(origin);
  res.statusCode = 200;
  Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function bad(res, code, message, origin) {
  const h = corsHeaders(origin);
  res.statusCode = code;
  Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

export function isPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    const h = corsHeaders(req.headers.origin || '*');
    Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function bearerToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h) return '';
  const m = /^Bearer\s+(.+)/i.exec(h);
  return m ? m[1] : '';
}

export function verifyJwtHS256(token, secret) {
  // Minimal HS256 verification to avoid external deps if desired.
  // Supports tokens without nested JSON in header/payload.
  const [b64h, b64p, sig] = (token || '').split('.');
  if (!b64h || !b64p || !sig) return null;
  const data = `${b64h}.${b64p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64p, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > Number(payload.exp)) return null;
    return payload;
  } catch { return null; }
}

export function allowedMethod(method) {
  const def = [
    'getblockcount','getblockhash','getblock',
    'getbalance','getwalletinfo','getblockchaininfo','getnewaddress','getaddressesbylabel','validateaddress','getaddressinfo',
    'listunspent','getrawtransaction',
    'createrawtransaction','fundrawtransaction','signrawtransactionwithwallet','signmessage','walletpassphrase',
    'sendrawtransaction','sendtoaddress','importprivkey','loadwallet','createwallet','setgenerate','stake'
  ];
  const list = (process.env.RPC_ALLOWED_METHODS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowed = list.length ? list : def;
  return allowed.includes(method);
}

export async function upstreamFetch(bodyObj) {
  const url = process.env.UPSTREAM_RPC_URL || 'http://127.0.0.1:8645';
  const user = process.env.UPSTREAM_RPC_USER || '';
  const pass = process.env.UPSTREAM_RPC_PASS || '';
  const headers = { 'Content-Type': 'application/json' };
  if (user || pass) {
    const basic = Buffer.from(`${user}:${pass}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyObj),
  });
  if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
  return res.json();
}
