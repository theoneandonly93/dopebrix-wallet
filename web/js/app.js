import { el, modal } from './utils/ui.js';
import { store } from './utils/storage.js';
import { Config } from './adapters/config.js';
import { renderOnboarding, isUnlocked, unlockWithPasscode } from './views/onboarding.js';
import { renderPortfolio } from './views/portfolio.js';
import { renderDiscover } from './views/discover.js';
import { renderSwap } from './views/swap.js';
import { renderBrowser } from './views/browser.js';
import { renderCreate } from './views/create.js';
import { renderToken } from './views/token.js';
import { renderNFT } from './views/nft.js';

window.addEventListener('load', async () => {
  // Mobile PWA service worker
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./service-worker.js'); } catch {}
  }

  await Config.load();
  // Try auto-unlock with remembered pass on this device
  if (store.get('wallet') && !isUnlocked()) {
    const remembered = store.get('remember');
    if (remembered) {
      try {
        const { deviceDecrypt } = await import('./utils/crypto.js');
        const pass = await deviceDecrypt(remembered);
        await unlockWithPasscode(pass);
      } catch {}
    }
  }
  const view = document.getElementById('view');
  const nav = document.querySelectorAll('.nav-btn');
  const settingsBtn = document.getElementById('settingsBtn');

  function setActive(route) {
    nav.forEach(n => n.classList.toggle('active', n.dataset.route === route));
  }

  async function routeTo(route) {
    if (!store.get('wallet')) { renderOnboarding(view); setActive('portfolio'); return; }
    if (!isUnlocked()) { renderOnboarding(view); setActive('portfolio'); return; }
    switch(route) {
      case 'portfolio': renderPortfolio(view); break;
      case 'discover': renderDiscover(view); break;
      case 'swap': renderSwap(view); break;
      case 'browser': renderBrowser(view); break;
      case 'create': renderCreate(view); break;
      default: renderPortfolio(view);
    }
    setActive(route);
  }

  nav.forEach(n => n.addEventListener('click', () => routeTo(n.dataset.route)));
  settingsBtn.addEventListener('click', openSettings);

  window.addEventListener('dbx:unlocked', () => routeTo('portfolio'));
  function parseHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return null;
    const [kind, id] = h.split(':');
    return { kind, id };
  }

  function routeFromHash() {
    const r = parseHash();
    if (!r) return routeTo('discover');
    if (!store.get('wallet') || !isUnlocked()) return renderOnboarding(view);
    if (r.kind === 'token') { renderToken(view, r.id); setActive('discover'); return; }
    if (r.kind === 'nft') { renderNFT(view, r.id); setActive('discover'); return; }
    return routeTo('discover');
  }

  window.addEventListener('hashchange', routeFromHash);
  // Initial route
  if (location.hash) routeFromHash(); else routeTo('portfolio');
});

function openSettings() {
  const cfg = Config.data;
  const form = el(`
    <div class="grid" style="gap:10px">
      <div class="title">Settings</div>
      <label class="label">Proxy Base URL</label>
      <input class="input" id="proxy" value="${cfg.PROXY_BASE || ''}" />
      <label class="label">Fairbrix RPC URL (server reads this)</label>
      <input class="input" id="rpc" value="${cfg.FAIRBRIX_RPC_URL || ''}" />
      <div class="row">
        <button class="btn" id="save">Save</button>
        <button class="btn secondary" id="close">Close</button>
      </div>
    </div>
  `);
  const m = modal(form);
  form.querySelector('#save').addEventListener('click', () => {
    Config.set('PROXY_BASE', form.querySelector('#proxy').value.trim());
    Config.set('FAIRBRIX_RPC_URL', form.querySelector('#rpc').value.trim());
    m.close();
  });
  form.querySelector('#close').addEventListener('click', m.close);
}
