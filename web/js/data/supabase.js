// Minimal Supabase client using fetch; avoids adding external deps
import { Config } from '../adapters/config.js';

function headers() {
  const key = Config.get('SUPABASE_ANON_KEY');
  return { 'apikey': key || '', 'Authorization': key ? `Bearer ${key}` : '' };
}

function base() { return Config.get('SUPABASE_URL'); }

async function sbGet(path, params) {
  const u = new URL(`${base()}/rest/v1/${path}`);
  if (params) Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, v));
  const res = await fetch(u, { headers: { ...headers(), 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('supabase get failed');
  return res.json();
}

async function sbPost(path, body) {
  const u = `${base()}/rest/v1/${path}`;
  const res = await fetch(u, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('supabase post failed');
  return res.json();
}

export async function trendingTokens() {
  if (!base()) return [];
  // Join tokens with 24h volume view, order desc
  const q = new URLSearchParams({ select: 'id,symbol,name,decimals,created_at,volume:token_volume_24h(volume_24h)', order: 'volume.desc' });
  const res = await fetch(`${base()}/rest/v1/tokens?${q.toString()}`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

export async function upsertToken(token) {
  if (!base()) return null;
  return sbPost('tokens', [token]);
}

export async function insertTrade(trade) {
  if (!base()) return null;
  return sbPost('trades', [trade]);
}

export async function insertNFT(nft) {
  if (!base()) return null;
  return sbPost('nfts', [nft]);
}

