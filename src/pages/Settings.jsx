import React from 'react';

function Row({ icon, title, right, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:24,height:24,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
        <div style={{fontWeight:600}}>{title}</div>
      </div>
      <div className="muted">{right || '›'}</div>
    </div>
  );
}

export default function Settings() {
  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };
  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Settings</div>
      </div>

      <div className="card">
        <div className="list">
          <Row icon={'⇆'} title="Preferences" onClick={()=>window.__setAppTab && window.__setAppTab('prefs')} />
          <Row icon={'🛡️'} title="Security" onClick={()=>window.__setAppTab && window.__setAppTab('security')} />
          <Row icon={'🔗'} title="Connected apps" onClick={()=>window.__setAppTab && window.__setAppTab('connected')} />
          <Row icon={'@'} title="Address book" onClick={()=>window.__setAppTab && window.__setAppTab('addressbook')} />
          <Row icon={'🛠️'} title="Advanced" />
          <Row icon={'🌐'} title="Networks" right="Mainnet ›" onClick={()=>window.__setAppTab && window.__setAppTab('networks')} />
          <Row icon={'🧩'} title="Manage Nodes" onClick={()=>window.__setAppTab && window.__setAppTab('nodes')} />
          <Row icon={'≡'} title="About" onClick={()=>window.__setAppTab && window.__setAppTab('about')} />
          <Row icon={'❓'} title="Support center" right="↗" onClick={()=>window.__setAppTab && window.__setAppTab('support')} />
        </div>
      </div>
    </div>
  );
}
