import { ok, bad, isPreflight } from './_utils.js';

export default async function handler(req, res) {
  if (isPreflight(req, res)) return;
  if (req.method !== 'GET') return bad(res, 405, 'Method Not Allowed', req.headers.origin || '*');
  const origin = req.headers.origin || '*';

  // Explicit env price takes precedence
  const fixed = process.env.PRICE_FBX_USD;
  if (fixed && !Number.isNaN(Number(fixed))) {
    return ok(res, { usd: Number(fixed) }, origin);
  }

  // Use fairbrixscan.com basic stats for USD price
  try {
    const r = await fetch('https://fairbrixscan.com/ext/getbasicstats');
    if (!r.ok) return bad(res, 502, 'Price feed error', origin);
    const j = await r.json().catch(()=>({}));
    let usd = 0;
    if (typeof j?.last_price_usd === 'number') usd = j.last_price_usd;
    return ok(res, { usd }, origin);
  } catch (e) {
    return bad(res, 502, e?.message || 'Price fetch failed', origin);
  }
}

