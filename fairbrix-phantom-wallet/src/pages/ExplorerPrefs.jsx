import React, { useState } from 'react';
import { usePrefs } from '../services/prefs.js';

function Section({ title, children }) {
  return (
    <div style={{marginTop:14}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
        <div className="token-circle"/>
        <div style={{fontWeight:800}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function RadioRow({ label, checked, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div>{label}</div>
      <div>{checked ? '✓' : ''}</div>
    </div>
  );
}

export default function ExplorerPrefs() {
  const prefs = usePrefs();
  const [cfb, setCfb] = useState(prefs.explorerFairbrixCustom);
  const [cdp, setCdp] = useState(prefs.explorerDopeCustom);
  const back = () => { if (window.__setAppTab) window.__setAppTab('prefs'); };

  const setFairbrix = (v) => { prefs.setExplorerFairbrix(v); };
  const setDope = (v) => { prefs.setExplorerDope(v); };

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Preferred explorer</div>
      </div>

      <div className="card">
        <Section title="Fairbrix">
          <RadioRow label="Fairbrixscan" checked={prefs.explorerFairbrix==='fairbrixscan'} onClick={()=>setFairbrix('fairbrixscan')} />
          <RadioRow label="OrdScan" checked={prefs.explorerFairbrix==='ordscan'} onClick={()=>setFairbrix('ordscan')} />
          <RadioRow label="Blockchain.com" checked={prefs.explorerFairbrix==='blockchain'} onClick={()=>setFairbrix('blockchain')} />
          <RadioRow label="Custom" checked={prefs.explorerFairbrix==='custom'} onClick={()=>setFairbrix('custom')} />
          {prefs.explorerFairbrix==='custom' && (
            <div className="row" style={{marginTop:8}}>
              <input className="input" placeholder="https://.../{txid}" value={cfb} onChange={(e)=>setCfb(e.target.value)} />
              <button className="cta" onClick={()=>prefs.setExplorerFairbrixCustom(cfb)}>Save</button>
            </div>
          )}
        </Section>

        <Section title="Dope">
          <RadioRow label="Dopa Explorer" checked={prefs.explorerDope==='dopa'} onClick={()=>setDope('dopa')} />
          <RadioRow label="Custom" checked={prefs.explorerDope==='custom'} onClick={()=>setDope('custom')} />
          {prefs.explorerDope==='custom' && (
            <div className="row" style={{marginTop:8}}>
              <input className="input" placeholder="https://.../{txid}" value={cdp} onChange={(e)=>setCdp(e.target.value)} />
              <button className="cta" onClick={()=>prefs.setExplorerDopeCustom(cdp)}>Save</button>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

