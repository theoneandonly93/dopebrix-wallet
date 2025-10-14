import { clear, el, toast } from '../utils/ui.js';
import { getToken, priceOf, marketCap, holdersCount, buyToken, sellToken } from '../data/db.js';

function fmt(n, d=4) { return Number(n).toFixed(d); }

function chart(elCanvas, token) {
  const c = elCanvas.getContext('2d');
  const w = elCanvas.width = elCanvas.clientWidth;
  const h = elCanvas.height = 120;
  const pts = token.trades.slice(-50).map(t => t.price);
  if (pts.length === 0) return;
  const min = Math.min(...pts), max = Math.max(...pts);
  c.clearRect(0,0,w,h);
  c.strokeStyle = '#32cd32'; c.lineWidth = 2; c.beginPath();
  pts.forEach((p,i) => {
    const x = (i/(pts.length-1)) * (w-10) + 5;
    const y = h - ((p - min) / (max - min + 1e-9)) * (h-10) - 5;
    if (i===0) c.moveTo(x,y); else c.lineTo(x,y);
  });
  c.stroke();
}

export function renderToken(root, id) {
  clear(root);
  const t = getToken(id);
  if (!t) { root.appendChild(el('<div class="subtitle">Token not found</div>')); return; }
  const v = el(`
    <div class="grid" style="gap:12px;max-width:640px;margin:0 auto">
      <div class="row space"><div class="title">${t.ticker}</div><div class="subtitle">ID: ${t.id}</div></div>
      <div class="card">
        <div class="row space">
          <div>Price: <b>${fmt(priceOf(t),6)} FBX</b></div>
          <div>Market Cap: <b>${fmt(marketCap(t))} FBX</b></div>
          <div>Holders: <b>${holdersCount(t)}</b></div>
        </div>
        <canvas id="chart" style="width:100%;height:120px"></canvas>
      </div>
      <div class="card">
        <div class="subtitle">Buy / Sell</div>
        <label class="label">Amount (FBX for buy / Token for sell)</label>
        <input class="input" id="amt" inputmode="decimal" placeholder="0.0" />
        <div class="row" style="margin-top:8px">
          <button class="btn" id="buy">Buy</button>
          <button class="btn secondary" id="sell">Sell</button>
        </div>
      </div>
      <div class="card">
        <div class="subtitle">Trade History</div>
        <div id="trades" class="list"></div>
      </div>
    </div>
  `);
  root.appendChild(v);

  function renderTrades() {
    const l = v.querySelector('#trades');
    l.innerHTML = '';
    t.trades.slice().reverse().slice(0,25).forEach(tr => {
      const it = el(`<div class="list-item"><div>${new Date(tr.ts).toLocaleTimeString()}</div><div class="subtitle">${tr.side.toUpperCase()} • ${fmt(tr.fbx)} FBX ↔ ${fmt(tr.token)} ${t.ticker} @ ${fmt(tr.price,6)}</div></div>`);
      l.appendChild(it);
    });
  }

  function renderChart() { chart(v.querySelector('#chart'), t); }
  renderTrades();
  setTimeout(renderChart, 0);

  v.querySelector('#buy').addEventListener('click', () => {
    const amt = parseFloat(v.querySelector('#amt').value || '0');
    if (!amt || amt<=0) return toast('Enter FBX amount');
    try { buyToken(t.id, amt); toast('Bought'); renderTrades(); renderChart(); v.querySelector('#amt').value=''; } catch (e) { toast('Buy failed'); }
  });
  v.querySelector('#sell').addEventListener('click', () => {
    const amt = parseFloat(v.querySelector('#amt').value || '0');
    if (!amt || amt<=0) return toast('Enter token amount');
    try { sellToken(t.id, amt); toast('Sold'); renderTrades(); renderChart(); v.querySelector('#amt').value=''; } catch (e) { toast('Sell failed'); }
  });
}

