import { clear, el, toast } from '../utils/ui.js';
import { Curve } from '../curve/curve.js';
import { broadcastRawTransaction } from '../adapters/fairbrixRpc.js';
import { fbxUsd, formatUSD } from '../data/market.js';
import { myHoldings, listNFTs } from '../data/db.js';

export function renderSwap(root) {
  clear(root);
  const v = el(`
    <div class="grid" style="gap:12px;max-width:640px;margin:0 auto">
      <div class="row space"><div class="title">Swap</div><div class="icon-btn" id="filters" aria-label="filters">⚙️</div></div>
      <div class="row" role="tablist" style="gap:8px">
        <button class="btn secondary" data-tab="tokens">Tokens</button>
        <button class="btn secondary" data-tab="nfts">NFTs</button>
      </div>
      <div id="swapview"></div>
    </div>
  `);
  root.appendChild(v);

  function renderTokenSwap() {
    const p = fbxUsd();
    const sv = el(`
      <div class="grid" style="gap:10px">
        <div class="swap-card">
          <div class="subtitle">You Pay</div>
          <div class="row space" style="gap:12px">
            <input class="swap-input" id="payAmt" inputmode="decimal" placeholder="0" />
            <div class="token-select">FBX</div>
          </div>
          <div class="subtitle" id="payFiat">0 FBX</div>
        </div>
        <div class="swap-middle"><button class="swap-rotate" id="flip">↕</button></div>
        <div class="swap-card">
          <div class="subtitle">You Receive</div>
          <div class="row space" style="gap:12px">
            <input class="swap-input" id="recvAmt" disabled placeholder="0" />
            <div class="token-select">USD</div>
          </div>
          <div class="subtitle" id="recvFiat">0 USD</div>
        </div>
        <button class="btn" id="swapBtn">Swap</button>
      </div>
    `);
    const wrap = v.querySelector('#swapview'); wrap.innerHTML=''; wrap.appendChild(sv);
    const pay = sv.querySelector('#payAmt'); const recv = sv.querySelector('#recvAmt');
    function recalc(dir=1) {
      const a = parseFloat(pay.value||'0');
      const usd = a * p * dir; // FBX->USD or USD->FBX
      if (dir===1) recv.value = isFinite(usd)? usd.toFixed(2):''; else recv.value = isFinite(a/p)? (a/p).toFixed(6):'';
      sv.querySelector('#payFiat').textContent = `${isFinite(a)?a:0} ${dir===1?'FBX':'USD'}`;
      sv.querySelector('#recvFiat').textContent = `${recv.value||0} ${dir===1?'USD':'FBX'}`;
    }
    let direction = 1; // 1 FBX->USD, -1 USD->FBX
    pay.addEventListener('input', () => recalc(direction));
    sv.querySelector('#flip').addEventListener('click', () => {
      direction *= -1;
      const left = sv.querySelectorAll('.token-select')[0];
      const right = sv.querySelectorAll('.token-select')[1];
      const tmp = left.textContent; left.textContent = right.textContent; right.textContent = tmp;
      pay.value=''; recv.value=''; recalc(direction);
    });
    sv.querySelector('#swapBtn').addEventListener('click', () => toast('Swap executed (demo)'));
    recalc(direction);
  }

  function renderNftSwap() {
    const market = el(`
      <div class="grid" style="gap:10px">
        <div class="subtitle">Your NFTs</div>
        <div id="nlist" class="list"></div>
      </div>
    `);
    const wrap = v.querySelector('#swapview'); wrap.innerHTML=''; wrap.appendChild(market);
    const mine = listNFTs().filter(n=>true); // in future, filter to owner
    const nlist = market.querySelector('#nlist');
    if (mine.length===0) { nlist.innerHTML = '<div class="subtitle">No NFTs</div>'; return; }
    mine.forEach(n => {
      const row = el(`<div class="list-item"><div>${n.name}</div><div class="row" style="gap:8px"><input class="input" style="width:90px" placeholder="$" inputmode="decimal"/><button class="btn">Sell</button></div></div>`);
      nlist.appendChild(row);
      row.querySelector('.btn').addEventListener('click', () => toast('Listed (demo)'));
    });
  }

  v.querySelectorAll('[data-tab]').forEach(b=> b.addEventListener('click', ()=>{
    v.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    if (b.dataset.tab==='tokens') renderTokenSwap(); else renderNftSwap();
  }));
  v.querySelector('[data-tab="tokens"]').classList.add('active');
  renderTokenSwap();
}
