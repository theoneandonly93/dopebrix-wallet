// Vercel serverless proxy for public Fairbrix explorer (avoids CORS)
import { ok, bad, isPreflight } from './_utils.js';

export default async function handler(req, res) {
  if (isPreflight(req, res)) return;
  if (req.method !== 'GET') return bad(res, 405, 'Method Not Allowed', req.headers.origin || '*');

  const origin = req.headers.origin || '*';
  const base = (process.env.INDEXER_API_URL || 'https://fairbrixscan.com').replace(/\/$/, '');
  const path = String(req.query.path || '').replace(/^\//, '');

  // Allow list of patterns to prevent open proxy
  const allow = [
    /^api\/getblockcount$/,
    /^ext\/getaddress\/([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,40})$/,
    /^ext\/getaddresstxs\/[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,40}\/\d+\/\d+$/,
  ];
  const allowed = allow.some((re) => re.test(path));
  if (!allowed) return bad(res, 400, 'Bad path', origin);

  try {
    const url = `${base}/${path}`;
    const r = await fetch(url);
    if (!r.ok) return bad(res, r.status, 'Indexer error', origin);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await r.json();
      return ok(res, j, origin);
    }
    const t = (await r.text()) || '';
    // Try to coerce numeric replies
    const n = Number(String(t).trim());
    if (!Number.isNaN(n)) return ok(res, n, origin);
    return ok(res, { data: t }, origin);
  } catch (e) {
    return bad(res, 502, e?.message || 'Bad Gateway', origin);
  }
}

