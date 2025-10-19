import React, { useEffect, useMemo, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function DopeDex() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [tab, setTab] = useState('swap'); // swap | pools | list
  const [tokens, setTokens] = useState([]);
  const [status, setStatus] = useState('');

  // Swap state
  const [payToken, setPayToken] = useState(null);
  const [recvToken, setRecvToken] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [picker, setPicker] = useState(null); // 'pay' | 'recv' | null

  const list = useMemo(() => tokens || [], [tokens]);

  useEffect(() => {
    (async () => {
      try { setTokens(await fairbrix.getPopularRunes()); } catch {}
    })();
  }, []);

  const handleConnect = async () => {
    try {
      const addr = await fairbrix.getOrCreateAddress('dex-wallet');
      setAddress(addr);
      setConnected(true);
    } catch (e) {
      setStatus('Connect failed');
    }
  };

  const pct = (p) => {
    const val = Number(payAmount) || 0;
    const next = (val * p).toFixed(4);
    setPayAmount(next);
  };

  const flip = () => {
    const a = payToken; const b = recvToken;
    setPayToken(b); setRecvToken(a);
  };

  const swap = async () => {
    setStatus('Swap route coming soon — requires pool backend.');
  };

  return (
    <div className="grid">
      <div className="card" style={{position:'sticky', top:0, zIndex:1}}>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div className="dex-brand">DOPE DEX</div>
          <div className="dex-tabs">
            <button className={`dex-tab ${tab==='swap'?'active':''}`} onClick={()=>setTab('swap')} title="Swap">⬌</button>
            <button className={`dex-tab ${tab==='pools'?'active':''}`} onClick={()=>setTab('pools')} title="Pools">◬</button>
            <button className={`dex-tab ${tab==='list'?'active':''}`} onClick={()=>setTab('list')} title="List">⏱</button>
          </div>
          {!connected ? (
            <button className="pill" onClick={handleConnect}>Connect</button>
          ) : (
            <span className="pill mono" title={address}>{address.slice(0,6)}…{address.slice(-6)}</span>
          )}
        </div>
      </div>

      {tab === 'swap' && (
        <div className="card dex-swap">
          <div className="title">Swap</div>
          <div className="dex-box">
            <div className="muted">Pay</div>
            <div className="row" style={{gap:8, alignItems:'center'}}>
              <input className="input" placeholder="0.00" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} />
              <button className="token-chip" onClick={()=>setPicker('pay')}>{(payToken?.ticker || payToken?.name || 'Select token')}</button>
            </div>
            <div className="pct-row">
              <button onClick={()=>pct(0.25)}>25%</button>
              <button onClick={()=>pct(0.50)}>50%</button>
              <button onClick={()=>pct(0.75)}>75%</button>
            </div>
          </div>

          <div className="swap-mid" onClick={flip}>⟳</div>

          <div className="dex-box">
            <div className="muted">Receive</div>
            <div className="row" style={{gap:8, alignItems:'center'}}>
              <input className="input" placeholder="0.00" value={payAmount ? '' : ''} readOnly />
              <button className="token-chip" onClick={()=>setPicker('recv')}>{(recvToken?.ticker || recvToken?.name || 'Select token')}</button>
            </div>
          </div>

          <div className="spacer"/>
          <button className="cta primary" onClick={swap} disabled={!payToken || !recvToken || !payAmount}>Swap</button>
        </div>
      )}

      {tab === 'pools' && (
        <div className="card">
          <div className="title">Create Pool</div>
          <div className="muted">Pool creation and AMM are planned. This UI will connect to a backend indexer/market maker to support Runes swaps on Fairbrix.</div>
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          <div className="title">Popular Runes</div>
          <div className="list">
            {list.map((it, i) => (
              <div className="list-item" key={`${it.ticker||it.name||'r'}-${i}`} onClick={()=>{ setPayToken(it); setTab('swap'); }}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div className="idx">{i+1}</div>
                  <div>
                    <div style={{fontWeight:700}}>{(it.name || it.ticker || 'RUNE').toUpperCase()}</div>
                    <div className="muted" style={{fontSize:12}}>mints: {it.mints||0} • transfers: {it.transfers||0}</div>
                  </div>
                </div>
                <button className="cta" onClick={(e)=>{e.stopPropagation(); fairbrix.mintRune({ ticker: it.ticker || it.name || 'RUNE', amount:1 });}} style={{background:'#222'}}>Mint +</button>
              </div>
            ))}
            {!list.length && (<div className="muted">No tokens yet</div>)}
          </div>
        </div>
      )}

      {picker && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>Select token</div>
              <button className="pill" onClick={()=>setPicker(null)}>Close</button>
            </div>
            <div className="spacer"/>
            <div className="list">
              {list.map((it, i) => (
                <div className="list-item" key={`pick-${i}`} onClick={()=>{ (picker==='pay'? setPayToken : setRecvToken)(it); setPicker(null); }}>
                  <div style={{fontWeight:700}}>{(it.name || it.ticker || 'RUNE').toUpperCase()}</div>
                  <div className="muted">#{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {status && <div className="card" style={{color:'#cbbdff'}}>{status}</div>}
    </div>
  );
}

