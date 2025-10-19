import React, { useEffect, useState } from 'react';

const LS = 'connected_apps';

function load() { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } }
function save(list) { try { localStorage.setItem(LS, JSON.stringify(list||[])); } catch {} }

export default function ConnectedApps() {
  const [apps, setApps] = useState([]);
  useEffect(()=>{ setApps(load()); },[]);
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };
  const disconnectAll = () => { save([]); setApps([]); };

  // Seed data for demo
  useEffect(()=>{
    if (!apps.length) {
      const seed = [{ name: 'Ord.io', permission: 'Read', icon: 'W' }];
      save(seed); setApps(seed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Connected Apps</div>
      </div>

      <div className="card">
        <div className="muted">You are connected to the following apps.</div>
        <div className="spacer"/>
        <div className="list">
          {apps.map((a,i)=> (
            <div key={i} className="list-item">
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:'#1c1f23',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>{a.icon || 'W'}</div>
                <div>
                  <div style={{fontWeight:700}}>{a.name}</div>
                  <div className="muted" style={{fontSize:12}}>{a.permission}</div>
                </div>
              </div>
              <div className="muted">›</div>
            </div>
          ))}
        </div>
      </div>

      <div className="earn-bottom">
        <button className="cta" style={{width:'100%'}} onClick={disconnectAll}>Disconnect all</button>
      </div>
    </div>
  );
}

