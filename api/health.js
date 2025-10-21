import { ok, bad, isPreflight, bearerToken, verifyJwtHS256, upstreamFetch } from './_utils.js';

export default async function handler(req, res) {
  if (isPreflight(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return bad(res, 405, 'Method Not Allowed', req.headers.origin || '*');

  const secret = process.env.API_JWT_SECRET || process.env.JWT_SECRET || '';
  if (secret) {
    const token = bearerToken(req);
    const payload = verifyJwtHS256(token, secret);
    if (!payload) return bad(res, 401, 'Unauthorized', req.headers.origin || '*');
  }

  try {
    const result = await upstreamFetch({ jsonrpc: '2.0', id: 'health', method: 'getblockcount', params: [] });
    return ok(res, { ok: true, best: Number(result?.result || 0) }, req.headers.origin || '*');
  } catch (e) {
    return ok(res, { ok: false, error: e?.message || 'unreachable' }, req.headers.origin || '*');
  }
}

