// Lightweight client for a generic Dopels-like API.
// It tries a few common paths so it can work with different backends.

const BASE = import.meta.env.VITE_DOPELS_API_URL || '';

async function tryJson(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (r.ok) return await r.json();
    } catch {}
  }
  return null;
}

export async function listLatest({ page = 1, limit = 24 } = {}) {
  if (!BASE) return [];
  const urls = [
    `${BASE}/inscriptions?limit=${limit}&page=${page}`,
    `${BASE}/api/inscriptions?limit=${limit}&page=${page}`,
    `${BASE}/latest?limit=${limit}&page=${page}`,
  ];
  const data = await tryJson(urls);
  if (!data) return [];
  // Normalize to {id, content, title, mime}
  if (Array.isArray(data)) return data.map(nrm);
  if (Array.isArray(data.items)) return data.items.map(nrm);
  return [];
}

export async function getInscription(id) {
  if (!BASE || !id) return null;
  const urls = [
    `${BASE}/inscription/${id}`,
    `${BASE}/api/inscription/${id}`,
  ];
  const data = await tryJson(urls);
  return data ? nrm(data) : null;
}

export async function search(q) {
  if (!BASE || !q) return [];
  const urls = [
    `${BASE}/search?q=${encodeURIComponent(q)}`,
    `${BASE}/api/search?q=${encodeURIComponent(q)}`,
  ];
  const data = await tryJson(urls);
  if (!data) return [];
  return Array.isArray(data) ? data.map(nrm) : (Array.isArray(data.items) ? data.items.map(nrm) : []);
}

function nrm(x) {
  const id = x.id || x.inscriptionId || x.inscription_id || x.txid || x.hash || x.cid || '';
  const mime = x.mime || x.contentType || x.type || '';
  const content = x.content || x.image || x.src || x.preview || '';
  const title = x.title || x.name || (id ? `#${String(id).slice(0, 8)}` : 'Inscription');
  return { id, mime, content, title, raw: x };
}

export const dopameme = { listLatest, getInscription, search };

