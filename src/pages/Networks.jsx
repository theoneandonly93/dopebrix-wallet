import React from 'react';
import { usePrefs } from '../services/prefs.js';

function NetworkRow({ label, selected, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div className="token-circle"/>
        <div style={{fontWeight:600}}>{label}</div>
      </div>
      <div>{selected ? '✓' : ''}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="muted" style={{letterSpacing:.6, marginTop:16, marginBottom:8}}>{children}</div>;
}

export default function Networks() {
  const prefs = usePrefs();
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };

  const test = !!prefs.testnet;

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Networks</div>
        <div style={{flex:1}}/>
        <button className="cta">+ Add network</button>
      </div>

      <div className="card">
        <div className="list">
          <div className="list-item" onClick={()=>prefs.setTestnet(!prefs.testnet)}>
            <div style={{fontWeight:600}}>Testnet mode</div>
            <label className="switch">
              <input type="checkbox" checked={test} readOnly />
              <span className="slider"></span>
            </label>
          </div>

          <SectionTitle>FAIRBRIX</SectionTitle>
          {!test && (
            <NetworkRow label="Mainnet" selected={prefs.netFairbrix==='mainnet'} onClick={()=>prefs.setNetFairbrix('mainnet')} />
          )}
          {test && (
            <>
              <NetworkRow label="Testnet" selected={prefs.netFairbrix==='testnet'} onClick={()=>prefs.setNetFairbrix('testnet')} />
              <NetworkRow label="Signet" selected={prefs.netFairbrix==='signet'} onClick={()=>prefs.setNetFairbrix('signet')} />
              <NetworkRow label="Regtest" selected={prefs.netFairbrix==='regtest'} onClick={()=>prefs.setNetFairbrix('regtest')} />
            </>
          )}

          <SectionTitle>DOPELGANGA (DOPE)</SectionTitle>
          {!test && (
            <NetworkRow label="Mainnet" selected={prefs.netDope==='mainnet'} onClick={()=>prefs.setNetDope('mainnet')} />
          )}
          {test && (
            <NetworkRow label="Testnet" selected={prefs.netDope==='testnet'} onClick={()=>prefs.setNetDope('testnet')} />
          )}
        </div>
      </div>
    </div>
  );
}

