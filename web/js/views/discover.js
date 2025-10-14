import { clear, el } from '../utils/ui.js';
import { UniSat } from '../adapters/unisat.js';
import { listTokens, listNFTs, topTrendingTokens, volume24h, priceOf } from '../data/db.js';
import { trendingTokens as sbTrending } from '../data/supabase.js';

export function renderDiscover(root) {
  clear(root);
  const v = el(`
    <div class="grid">
      <div class="title">Discover</div>
      <div class="row" role="tablist" style="gap:8px">
        <button class="btn secondary" data-tab="trending">Trending</button>
        <button class="btn secondary" data-tab="tokens">Tokens</button>
        <button class="btn secondary" data-tab="nfts">NFTs</button>
      </div>
      <div id="list" class="list"></div>
    </div>
  `);
  root.appendChild(v);

  function renderTab(tab) {
    const list = v.querySelector('#list');
    list.innerHTML = '';
    if (tab === 'trending') {
      // Try Supabase trending, then UniSat, then local fallback
      (async () => {
        try {
          const sbt = await sbTrending();
          if (sbt && sbt.length) {
            list.innerHTML = '';
            sbt.slice(0,20).forEach(it => {
              const name = it.symbol || it.name || 'Token';
              const vol = (it.volume && it.volume.volume_24h) || 0;
              const li = el(`<div class=\"list-item\"><div>${name}</div><div class=\"subtitle\">Vol24h: ${vol}</div></div>`);
              list.appendChild(li);
            });
            return;
          }
          const remote = await UniSat.getTrending();
          list.innerHTML = '';
          if (!remote || remote.length === 0) throw new Error('no remote');
          remote.slice(0, 20).forEach(it => {
            const name = it.ticker || it.name || 'Token';
            const vol = it.volume24h || 0;
            const li = el(`<div class=\"list-item\"><div>${name}</div><div class=\"subtitle\">Vol24h: ${vol}</div></div>`);
            list.appendChild(li);
          });
        } catch {
          const items = topTrendingTokens();
          if (items.length === 0) list.innerHTML = '<div class="subtitle">No tokens yet. Create one!</div>';
          items.forEach(t => {
            const li = el(`<div class=\"list-item\" data-id=\"${t.id}\"><div>${t.ticker}</div><div class=\"subtitle\">Vol24h: ${volume24h(t).toFixed(4)} FBX • Px ${priceOf(t).toFixed(6)}</div></div>`);
            li.addEventListener('click', () => { location.hash = `#token:${t.id}`; });
            list.appendChild(li);
          });
        }
      })();
    }
    if (tab === 'tokens') {
      const items = listTokens();
      if (items.length === 0) list.innerHTML = '<div class="subtitle">No tokens yet. Create one!</div>';
      items.forEach(t => {
        const li = el(`<div class="list-item" data-id="${t.id}"><div>${t.ticker}</div><div class="subtitle">Px ${priceOf(t).toFixed(6)} FBX</div></div>`);
        li.addEventListener('click', () => { location.hash = `#token:${t.id}`; });
        list.appendChild(li);
      });
    }
    if (tab === 'nfts') {
      const items = listNFTs();
      if (items.length === 0) list.innerHTML = '<div class="subtitle">No NFTs yet. Create one!</div>';
      items.forEach(n => {
        const li = el(`<div class="list-item" data-id="${n.id}"><div>${n.name}</div><div class="subtitle">Owner: ${n.owner}</div></div>`);
        li.addEventListener('click', () => { location.hash = `#nft:${n.id}`; });
        list.appendChild(li);
      });
    }
  }

  v.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      v.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });
  v.querySelector('[data-tab="trending"]').classList.add('active');
  renderTab('trending');
}
