import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function Swap() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState('0');
  const [list, setList] = useState([]);
  const [picker, setPicker] = useState(null); // 'from'|'to'|null

  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };

  useEffect(() => { (async () => {
    try { setList(await fairbrix.getPopularRunes()); } catch {}
  })(); }, []);

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Swap</div>
      </div>

      <div className="card">
        <div className="row" style={{gap:10, alignItems:'center'}}>
          <button className="asset-select" onClick={()=>setPicker('from')}>{from ? (from.ticker||from.name) : 'Select asset'} ▾</button>
          <div className="swap-mid">⚡</div>
          <button className="asset-select" onClick={()=>setPicker('to')}>{to ? (to.ticker||to.name) : 'Select asset'} ▾</button>
        </div>
        <div className="spacer"/>
        <div className="label">Amount</div>
        <div className="box-input">
          <input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          <div className="muted">$0.00 USD</div>
        </div>
        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <div className="muted">Balance: --</div>
          <button className="chip">MAX</button>
        </div>
      </div>

      <div className="earn-bottom">
        <button className="cta" disabled style={{width:'100%', opacity:.6}}>Get quotes</button>
      </div>

      {picker && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>{picker==='from'?'From':'To'}</div>
              <button className="pill" onClick={()=>setPicker(null)}>Close</button>
            </div>
            <div className="spacer"/>
            <div className="list">
              {list.map((it, i) => (
                <div className="list-item" key={`pick-${i}`} onClick={()=>{ (picker==='from'? setFrom : setTo)(it); setPicker(null); }}>
                  <div>{(it.ticker||it.name||'RUNE').toUpperCase()}</div>
                  <div className="muted">mints {it.mints||0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

