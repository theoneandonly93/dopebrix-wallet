import { clear, el, sheet } from '../utils/ui.js';
import { getBlockchainInfo, getWalletInfo, getBalances, getNewAddress } from '../adapters/fairbrixRpc.js';
import { Config } from '../adapters/config.js';
import { myHoldings, priceOf, listAccounts, getActiveAccount, setActiveAccount, addAccount } from '../data/db.js';

export function renderPortfolio(root) {
  clear(root);
  const v = el(`
    <div class="grid" style="gap:16px">
      <div class="row space account-header" id="acctHeader">
        <div class="row" style="gap:10px; align-items:center" id="acctBtn">
          <div class="avatar">A1</div>
          <div>
            <div class="acct-name">Account 1</div>
            <div class="subtitle">Imported wallet</div>
          </div>
          <div class="chev">▾</div>
        </div>
        <div class="row" style="gap:8px">
          <button class="icon-btn" aria-label="Search">🔎</button>
          <button class="icon-btn" aria-label="Settings" id="pSettings">⚙️</button>
        </div>
      </div>
      <div id="summary" class="card">Loading chain info…</div>
      <div class="grid cols-2-desktop">
        <div class="card"><div class="subtitle">Token Holdings</div><div id="tokens">—</div></div>
        <div class="card"><div class="subtitle">NFTs</div><div id="nfts">—</div></div>
      </div>
      <div class="grid cols-2-desktop">
        <div class="card"><div class="subtitle">Staking</div><div>Coming soon</div></div>
        <div class="card"><div class="subtitle">Mining</div><div>Coming soon</div></div>
      </div>
    </div>
  `);
  root.appendChild(v);

  // Populate account header
  const a = getActiveAccount();
  if (a) {
    v.querySelector('.acct-name').textContent = a.name || 'Account';
    v.querySelector('.avatar').textContent = a.name ? a.name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase() : 'A';
  }
  v.querySelector('#acctBtn').addEventListener('click', () => openAccountsSheet());

  function openAccountsSheet() {
    const wrap = el(`<div class="grid" style="gap:12px">
      <div class="title">Accounts</div>
      <div class="subtitle">Recovery Phrase 1</div>
      <div id="alist" class="grid" style="gap:10px"></div>
      <button class="manage-btn" id="manage">Manage Accounts</button>
    </div>`);
    const sh = sheet(wrap);
    const list = wrap.querySelector('#alist');
    const accs = listAccounts();
    list.innerHTML = '';
    accs.forEach(acc => {
      const it = el(`<div class="account-item" data-id="${acc.id}"><div class="avatar">${(acc.name||'A').slice(0,1)}</div><div style="flex:1"><div>${acc.name}</div><div class="subtitle">$0.00</div></div></div>`);
      it.addEventListener('click', () => { setActiveAccount(acc.id); sh.close(); location.hash = ''; });
      list.appendChild(it);
    });
    wrap.querySelector('#manage').addEventListener('click', async () => {
      await addAccount(window.__DBX?.seed || '');
      sh.close(); location.hash='';
    });
  }

  getBlockchainInfo().then(info => {
    const s = v.querySelector('#summary');
    s.textContent = `Network: ${info.chain} • Blocks: ${info.blocks} • Difficulty: ${info.difficulty}`;
  }).catch(() => {
    v.querySelector('#summary').textContent = 'Unable to reach Fairbrix RPC via proxy. Check Settings.';
  });

  // Wallet balance + receive address
  const walletCard = el(`<div class="card"><div class="subtitle">Wallet</div><div id="addr" class="subtitle">Address: —</div><div id="bal" class="title">Balance: — FBX</div></div>`);
  v.appendChild(walletCard);
  (async () => {
    try {
      // Ensure at least one address exists for display
      const addr = await getNewAddress('DopeBrix','bech32');
      walletCard.querySelector('#addr').textContent = `Address: ${addr}`;
    } catch {}
    try {
      let balText = '';
      try {
        const b = await getBalances();
        const mine = b.mine || b; // compatibility
        const trusted = mine.trusted ?? mine.balance ?? 0;
        const immature = mine.immature ?? 0;
        const untrusted = mine.untrusted_pending ?? 0;
        balText = `${(trusted + untrusted + immature).toFixed(8)} FBX`;
      } catch {
        const wi = await getWalletInfo();
        const total = (wi.balance || 0) + (wi.unconfirmed_balance || 0);
        balText = `${Number(total).toFixed(8)} FBX`;
      }
      walletCard.querySelector('#bal').textContent = `Balance: ${balText}`;
    } catch (e) {
      walletCard.querySelector('#bal').textContent = 'Balance: — (RPC wallet disabled)';
    }
  })();

  // Holdings list
  const listWrap = el(`<div class="card"><div class="subtitle">Your Tokens</div><div id="holdings" class="list"></div></div>`);
  v.appendChild(listWrap);
  const h = myHoldings();
  const ul = listWrap.querySelector('#holdings');
  if (h.length === 0) {
    ul.innerHTML = '<div class="subtitle">No holdings yet. Create or buy in Discover.</div>';
  } else {
    h.forEach(({ token, balance }) => {
      const item = el(`<div class="list-item" data-id="${token.id}"><div>${token.ticker}</div><div>${balance.toFixed(4)} • ${priceOf(token).toFixed(6)} FBX</div></div>`);
      item.addEventListener('click', () => { location.hash = `#token:${token.id}`; });
      ul.appendChild(item);
    });
  }
}
