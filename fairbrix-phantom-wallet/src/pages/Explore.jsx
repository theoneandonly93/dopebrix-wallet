import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function Explore() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('dbx');

  useEffect(() => {
    (async () => {
      setStatus('Loading...');
      try {
        const list = await fairbrix.getTrending();
        setItems(list);
        setStatus('');
      } catch (e) {
        setStatus('Indexer unavailable');
      }
    })();
  }, []);

  const goTo = (pathOrTab) => {
    if (pathOrTab && pathOrTab.startsWith('tab:')) {
      const t = pathOrTab.split(':')[1];
      if (window.__setAppTab) return window.__setAppTab(t);
    }
    try { window.location.hash = ''; } catch {}
    window.location.href = pathOrTab;
  };

  return (
    <div className="grid">
      <div className="card">
        <div style={{fontWeight:800, fontSize:28}}>Explore</div>
        <div className="spacer"/>

        {/* Removed horizontal hero slider to keep page condensed */}

        {/* Category chips */}
        <div className="chipbar">
          <button className={`chip ${tab==='dbx'?'active':''}`} onClick={()=>setTab('dbx')}>DOP EBRIX</button>
          <button className={`chip ${tab==='trade'?'active':''}`} onClick={()=>setTab('trade')}>TRADE</button>
          <button className={`chip ${tab==='earn'?'active':''}`} onClick={()=>setTab('earn')}>EARN</button>
          <button className={`chip ${tab==='tools'?'active':''}`} onClick={()=>setTab('tools')}>TOOLS</button>
        </div>

        <div className="spacer"/>

        {/* Links list (Xverse-like) */}
        <div className="list">
          <div className="list-item link-row" onClick={()=>goTo('tab:dopameme')}>
            <div className="icon-circle" style={{background:'#22c55e'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>DopaMeme</div>
              <div className="muted" style={{fontSize:12}}>Explore Fairbrix inscriptions (Ordinals-style).</div>
            </div>
            <div className="muted">›</div>
          </div>
          <div className="list-item link-row" onClick={()=>goTo('tab:dopedex')}>
            <div className="icon-circle" style={{background:'#0ea5e9'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>Dope Dex</div>
              <div className="muted" style={{fontSize:12}}>Swap runes memes on Fairbrix network.</div>
            </div>
            <div className="muted">›</div>
          </div>
          <div className="list-item link-row" onClick={()=>goTo('tab:create')}>
            <div className="icon-circle" style={{background:'#ff9f0a'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>Dopebrix Runes</div>
              <div className="muted" style={{fontSize:12}}>Mint or etch Dopebrix Runes in a few clicks.</div>
            </div>
            <div className="muted">›</div>
          </div>

          <div className="list-item link-row" onClick={()=>goTo('https://nonkyc.io/market/FBX_USDT')}>
            <div className="icon-circle" style={{background:'#7c4dff'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>Cross‑Chain Swap</div>
              <div className="muted" style={{fontSize:12}}>Swap FBX for USDT and more via NonKYC.</div>
            </div>
            <div className="muted">›</div>
          </div>

          <div className="list-item link-row" onClick={()=>goTo('tab:earn')}>
            <div className="icon-circle" style={{background:'#12b886'}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>Dopebrix Earn</div>
              <div className="muted" style={{fontSize:12}}>Stake FBX to earn network rewards.</div>
            </div>
            <div className="muted">›</div>
          </div>

          {/* Trending tokens/NFTs from indexer */}
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
            <div className="muted">No featured items yet.</div>
          )}
        </div>
      </div>
      {status && <div className="card" style={{color:'#cbbdff'}}>{status}</div>}
    </div>
  );
}
