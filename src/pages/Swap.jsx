

import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';
import Toast from '../components/Toast.jsx';

export default function Swap() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState('0');
  const [list, setList] = useState([]);
  const [picker, setPicker] = useState(null); // 'from'|'to'|null
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapStatus, setSwapStatus] = useState(null);
  const [balances, setBalances] = useState({ FBX: 0, USDC: 0 });
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const walletAddress = localStorage.getItem('fbx_addr');

  useEffect(() => {
    (async () => {
      try {
        setList(await fairbrix.getPopularRunes());
        const res = await fetch(
          import.meta.env.VITE_FAIRBRIX_RPC_URL + "/balances/" + walletAddress
        );
        const data = await res.json();
        setBalances(data);
      } catch (err) {
        console.warn("Balance fetch failed", err);
      }
    })();
    // WebSocket for instant balance updates
    if (!walletAddress) return;
    const wsUrl = import.meta.env.VITE_FAIRBRIX_WS_URL || 'ws://localhost:9501';
    const ws = new window.WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ address: walletAddress }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'balance') {
        setBalances(msg.data);
        localStorage.setItem('balances', JSON.stringify(msg.data));
      }
    };
    return () => ws.close();
  }, [walletAddress]);

  // Listen for live balance updates via SSE
  useEffect(() => {
    if (!walletAddress) return;
    const ev = new window.EventSource(
      import.meta.env.VITE_FAIRBRIX_RPC_URL + "/events/" + walletAddress
    );
    ev.addEventListener("balance-update", (e) => {
      const data = JSON.parse(e.data);
      fetch(import.meta.env.VITE_FAIRBRIX_RPC_URL + "/balances/" + walletAddress)
        .then((r) => r.json())
        .then(setBalances);
      setToastMsg(`💵 ${data.amountUSD} USDC credited`);
      setShowToast(true);
    });
    return () => ev.close();
  }, [walletAddress]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(
        import.meta.env.VITE_FAIRBRIX_RPC_URL + "/balances/" + walletAddress
      );
      const data = await res.json();
      setBalances(data);
    }, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };

  const canQuote = from && to && amount && !isNaN(Number(amount)) && Number(amount) > 0;

  const getQuote = async () => {
    setLoading(true);
    setQuote(null);
    setSwapStatus(null);
    try {
      // Use fairbrix.getSwapQuote with object args
      const q = await fairbrix.getSwapQuote({
        from: from.ticker || from.name,
        to: to.ticker || to.name,
        amount
      });
      setQuote(q);
    } catch (e) {
      setQuote({ error: 'Failed to fetch quote.' });
    }
    setLoading(false);
  };

  const confirmSwap = async () => {
    setLoading(true);
    setSwapStatus(null);
    try {
      // Use fairbrix.performSwap with object args
      const result = await fairbrix.performSwap({
        from: from.ticker || from.name,
        to: to.ticker || to.name,
        amount
      });
      setSwapStatus(result?.txid ? `Swap successful! TXID: ${result.txid}` : 'Swap failed.');
    } catch (e) {
      setSwapStatus('Swap failed.');
    }
    setLoading(false);
  };

  return (
    <div className="grid">
      <Toast message={toastMsg} show={showToast} onClose={()=>setShowToast(false)} />
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Swap</div>
      </div>

      <div className="card">
        <div className="row" style={{gap:10, alignItems:'center'}}>
          <button className="asset-select" onClick={()=>setPicker('from')}>{from ? (from.ticker||from.name) : 'Select asset'} ▾</button>
          <div className="swap-mid">⚡</div>
          <button className="asset-select" onClick={()=>setPicker('to')}>{to ? (to.ticker||to.name) : 'Select asset'} ▾</button>
        </div>
        <div className="spacer"/>
        <div className="label">Amount</div>
        <div className="box-input">
          <input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          <div className="muted">$0.00 USD</div>
        </div>
        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <div className="muted">
            Balance: {from
              ? from.ticker === "USDC"
                ? balances.USDC.toFixed(2)
                : balances.FBX.toFixed(4)
              : "--"}
          </div>
          <button className="chip" onClick={() => setAmount(
            from?.ticker === "USDC" ? balances.USDC : balances.FBX
          )}>
            MAX
          </button>
        </div>
      </div>

      <div className="earn-bottom">
        <button className="cta" style={{width:'100%'}} disabled={!canQuote || loading} onClick={getQuote}>
          {loading ? 'Loading...' : 'Get quotes'}
        </button>
      </div>

      {quote && (
        <div className="card" style={{marginTop:16}}>
          {quote.error ? (
            <div className="muted">{quote.error}</div>
          ) : (
            <>
              <div>Quote: {quote.rate} {to ? (to.ticker||to.name) : ''} per {from ? (from.ticker||from.name) : ''}</div>
              <div>Fee: {quote.fee}</div>
              <button className="cta" style={{width:'100%',marginTop:8}} disabled={loading} onClick={confirmSwap}>Confirm Swap</button>
            </>
          )}
        </div>
      )}

      {swapStatus && (
        <div className="muted" style={{marginTop:8}}>{swapStatus}</div>
      )}

      {picker && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>{picker==='from'?'From':'To'}</div>
              <button className="pill" onClick={()=>setPicker(null)}>Close</button>
            </div>
            <div className="spacer"/>
            <div className="list">
              {list.map((it, i) => (
                <div className="list-item" key={`pick-${i}`} onClick={()=>{ (picker==='from'? setFrom : setTo)(it); setPicker(null); }}>
                  <div>{(it.ticker||it.name||'RUNE').toUpperCase()}</div>
                  <div className="muted">mints {it.mints||0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
