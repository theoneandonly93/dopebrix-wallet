import React, { useState } from 'react';

export default function Support() {
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };
  const [q, setQ] = useState('');
  const search = () => {
    const url = `https://support.dopebrix.io/?q=${encodeURIComponent(q)}`;
    window.open(url, '_blank');
  };
  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Support Center</div>
      </div>

      <div className="card" style={{textAlign:'center'}}>
        <div style={{fontWeight:800, fontSize:22}}>What can we help you with?</div>
        <div className="spacer"/>
        <div className="row" style={{alignItems:'center'}}>
          <input className="input" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') search(); }} />
          <button className="cta" onClick={search}>Search</button>
        </div>
      </div>
    </div>
  );
}

