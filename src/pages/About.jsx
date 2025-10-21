import React from 'react';
import pkg from '../../package.json';

export default function About() {
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };
  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>About</div>
      </div>

      <div className="card">
        <div className="list">
          <div className="list-item" onClick={()=>window.open('https://dopebrix.io/terms','_blank')}> <div>Terms of Service</div> <div>↗</div> </div>
          <div className="list-item" onClick={()=>window.open('https://dopebrix.io/privacy','_blank')}> <div>Privacy Policy</div> <div>↗</div> </div>
          <div className="list-item"> <div>Version</div> <div>{pkg?.version || '1.0.0'}</div> </div>
        </div>
      </div>
    </div>
  );
}

