import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function Trending() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      setStatus('Loading…');
      try {
        const list = await fairbrix.getTrending();
        setItems(list);
        setStatus('');
      } catch (e) {
        setStatus('Indexer unavailable');
      }
    })();
  }, []);

  return (
    <div className="grid">
      <div className="card">
  <div style={{fontWeight:700}}>Trending tokens & Dopels</div>
        <div className="spacer"/>
        <div className="list">
          {items.map((it, i) => (
            <div className="list-item" key={i}>
              <div>
                <div style={{fontWeight:600}}>{it.name || it.ticker || 'Unnamed'}</div>
                <div className="muted" style={{fontSize:12}}>{it.type || 'token'}</div>
              </div>
              <div className="token-tag">{(it.volume24h || 0).toLocaleString()} vol</div>
            </div>
          ))}
          {!items.length && !status && (
            <div className="muted">No trending data yet.</div>
          )}
        </div>
      </div>
      {status && <div className="card" style={{color:'#cbbdff'}}>{status}</div>}
    </div>
  );
}

