// Vercel serverless JSON-RPC proxy for mobile/web
import { ok, bad, isPreflight, bearerToken, verifyJwtHS256, allowedMethod, upstreamFetch } from './_utils.js';

export default async function handler(req, res) {
  if (isPreflight(req, res)) return;
  if (req.method !== 'POST') return bad(res, 405, 'Method Not Allowed', req.headers.origin || '*');

  let body;
  try {
    const text = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; if (data.length > 1e6) reject(new Error('Body too large')); });
      req.on('end', () => resolve(data || '{}'));
      req.on('error', reject);
    });
    body = JSON.parse(text);
  } catch {
    return bad(res, 400, 'Invalid JSON', req.headers.origin || '*');
  }

  const token = bearerToken(req);
  const secret = process.env.API_JWT_SECRET || process.env.JWT_SECRET || '';
  if (secret) {
    const payload = verifyJwtHS256(token, secret);
    if (!payload) return bad(res, 401, 'Unauthorized', req.headers.origin || '*');
  }

  const method = body?.method;
  if (!method || typeof method !== 'string') return bad(res, 400, 'Missing method', req.headers.origin || '*');
  if (!allowedMethod(method)) return bad(res, 403, 'Method not allowed', req.headers.origin || '*');

  try {
    const result = await upstreamFetch(body);
    return ok(res, result, req.headers.origin || '*');
  } catch (e) {
    return bad(res, 502, e?.message || 'Bad Gateway', req.headers.origin || '*');
  }
}

