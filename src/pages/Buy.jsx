import React, { useState } from 'react';

export default function Buy() {
  const [fiat, setFiat] = useState('USD');
  const [amount, setAmount] = useState('0');

  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };

  const quick = (v) => setAmount(String(v));

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Buy</div>
        <div style={{flex:1}}/>
        <div className="pill" style={{display:'inline-flex', gap:8, alignItems:'center'}}>
          <span role="img" aria-label="flag">🇺🇸</span>
          <select value={fiat} onChange={(e)=>setFiat(e.target.value)} style={{background:'transparent', color:'inherit', border:0}}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="buy-amount">${amount}</div>
        <div className="muted">0 BTC</div>
        <div className="chipbar" style={{marginTop:14}}>
          <button className="chip" onClick={()=>quick(100)}>$100</button>
          <button className="chip" onClick={()=>quick(500)}>$500</button>
          <button className="chip" onClick={()=>quick(1000)}>$1000</button>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
          <div className="muted">You want to buy</div>
          <div className="row" style={{alignItems:'center', gap:8}}>
            <div className="token-circle"/>
            <div>Bitcoin</div>
            <div>›</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
          <div className="muted">Pay with</div>
          <div className="row" style={{alignItems:'center', gap:8}}>
            <div className="token-circle"/>
            <div>Credit Card</div>
            <div>›</div>
          </div>
        </div>
      </div>

      <div className="earn-bottom">
        <button className="cta" disabled style={{width:'100%', opacity:.6}}>Get quotes</button>
      </div>
    </div>
  );
}

