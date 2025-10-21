import { ok, bad, isPreflight } from './_utils.js';
import crypto from 'node:crypto';
  const getAllow = [/^balances$/, /^rewards$/, /^history\\/[A-Za-z0-9]+$/i, /^pending$/];
  const postAllow = [/^transfer$/, /^genesis$/];
  const isAllowed = method === 'GET' ? getAllow.some(re => re.test(path)) : postAllow.some(re => re.test(path));

export default async function handler(req, res) {
  if (isPreflight(req, res)) return;

  const origin = req.headers.origin || '*';
  const base = (process.env.DOPE_API_URL || '').replace(/\/$/, '');
  if (!base) return bad(res, 500, 'DOPE_API_URL not set', origin);

  const path = String(req.query.path || '').replace(/^\//, '');
  const method = req.method || 'GET';

  // Allowlist per-method
  const getAllow = [/^balances$/, /^history\/[A-Za-z0-9]+$/i, /^pending$/];
  const postAllow = [/^transfer$/, /^genesis$/];
  const isAllowed = method === 'GET' ? getAllow.some(re => re.test(path)) : postAllow.some(re => re.test(path));
  if (!isAllowed) return bad(res, 405, 'Method/Path Not Allowed', origin);

  try {
    const url = `${base}/${path || 'balances'}`;
    const headers = { };
    const token = process.env.DOPE_API_TOKEN || '';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const secret = process.env.DOPE_HMAC_SECRET || '';

    if (method === 'GET') {
      // Optional HMAC for GET: sign path + timestamp
      if (secret) {
        const ts = String(Math.floor(Date.now() / 1000));
        const msg = `${path}|${ts}`;
        const sig = crypto.createHmac('sha256', secret).update(msg).digest('hex');
        headers['x-timestamp'] = ts;
        headers['x-signature'] = sig;
      }
      let r = await fetch(url, { headers });\n      if (!r.ok && r.status === 404 && path === 'balances') {\n        const alt = ${base}/rewards;\n        r = await fetch(alt, { headers });\n      }\n      if (!r.ok) return bad(res, r.status, 'DOPE proxy error', origin);
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) { const j = await r.json(); return ok(res, j, origin); }
      const t = await r.text();
      return ok(res, { data: t }, origin);
    }

    // POST proxy (transfer/genesis)
    let bodyText = '';
    try { for await (const chunk of req) bodyText += chunk; } catch {}
    const postHeaders = { 'Content-Type': 'application/json', ...headers };
    if (secret) {
      const sig = crypto.createHmac('sha256', secret).update(bodyText || '').digest('hex');
      postHeaders['x-signature'] = sig;
    }
    const r = await fetch(url, { method: 'POST', headers: postHeaders, body: bodyText || '{}' });
    if (!r.ok) return bad(res, r.status, 'DOPE proxy error', origin);
    const j = await r.json().catch(()=>({ ok: true }));
    return ok(res, j, origin);
  } catch (e) {
    return bad(res, 502, e?.message || 'Bad Gateway', origin);
  }
}



