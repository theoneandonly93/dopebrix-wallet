import React from 'react';
import { usePrefs } from '../services/prefs.js';

function Row({ title, right, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div style={{fontWeight:600}}>{title}</div>
      <div className="muted">{right || '›'}</div>
    </div>
  );
}

export default function Preferences() {
  const prefs = usePrefs();
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Preferences</div>
      </div>

      <div className="card">
        <div className="list">
          <Row title="Display language" right={prefs.lang} onClick={()=>prefs.setLang(prefs.lang==='English'?'Spanish':'English')} />
          <Row title="Fiat currency" right={prefs.fiat} onClick={()=>prefs.setFiat(prefs.fiat==='USD'?'EUR':'USD')} />
          <Row title="Browser search engine" right={prefs.search} onClick={()=>prefs.setSearch(prefs.search==='Google'?'DuckDuckGo':'Google')} />
          <Row title="Privacy preferences" right="›" />
          <Row title="Preferred explorer" right="›" onClick={()=>window.__setAppTab && window.__setAppTab('prefs_explorer')} />
          <div className="list-item" onClick={()=>prefs.setHaptics(!prefs.haptics)}>
            <div style={{fontWeight:600}}>Haptic feedback</div>
            <div>
              <label className="switch">
                <input type="checkbox" checked={!!prefs.haptics} readOnly />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

