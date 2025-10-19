import React, { useEffect, useState } from 'react';

const LS = 'address_book';
const load = () => { try { return JSON.parse(localStorage.getItem(LS)||'[]'); } catch { return []; } };
const save = (list) => { try { localStorage.setItem(LS, JSON.stringify(list||[])); } catch {} };

export default function AddressBook() {
  const [items, setItems] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [label, setLabel] = useState('');
  const [addr, setAddr] = useState('');
  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };

  useEffect(()=>{ setItems(load()); },[]);
  const add = () => { setSheet(true); };
  const saveEntry = () => {
    if (!label || !addr) return;
    const list = [...items, { label, addr }];
    save(list); setItems(list); setSheet(false); setLabel(''); setAddr('');
  };

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Address book</div>
      </div>

      {(!items || items.length===0) && (
        <div className="card" style={{textAlign:'center', padding:'36px 16px'}}>
          <div className="muted" style={{fontSize:20, marginBottom:8}}>No saved addresses yet</div>
          <div className="muted">Your saved addresses will be displayed here after you add them.</div>
          <div className="spacer"/>
          <button className="cta primary" onClick={add}>Add address</button>
        </div>
      )}

      {items && items.length>0 && (
        <div className="card">
          <div className="list">
            {items.map((it,i)=> (
              <div key={i} className="list-item">
                <div>
                  <div style={{fontWeight:700}}>{it.label}</div>
                  <div className="mono" style={{fontSize:12}}>{it.addr}</div>
                </div>
                <div className="muted">›</div>
              </div>
            ))}
          </div>
          <div className="spacer"/>
          <button className="cta" onClick={add}>Add address</button>
        </div>
      )}

      {sheet && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header"><div style={{fontWeight:800}}>Add address</div><button className="pill" onClick={()=>setSheet(false)}>✕</button></div>
            <label className="label">Label</label>
            <input className="input" value={label} onChange={(e)=>setLabel(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Address</label>
            <input className="input" value={addr} onChange={(e)=>setAddr(e.target.value)} />
            <div className="spacer"/>
            <div className="row">
              <button className="cta" onClick={()=>setSheet(false)}>Cancel</button>
              <button className="cta primary" onClick={saveEntry} disabled={!label || !addr}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

