  // Helper for metallic glow header
  const MetallicGlow = ({ children }) => (
    <span style={{
      background: 'linear-gradient(90deg,#b8f0ff 0%,#e0eafc 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
      animation: 'metallic-glow 2.2s linear infinite',
      fontWeight: 800,
      fontSize: '1.1rem',
      letterSpacing: 1,
      marginLeft: 8,
    }}>
      {children}
    </span>
  );
import React, { useEffect, useMemo, useState, useRef } from 'react';
// Load cached wallet data for instant UI
const getCachedWallet = () => {
  let cached = {};
  try {
    cached.address = localStorage.getItem('fbx_addr') || '';
    cached.balance = Number(localStorage.getItem('fbx_balance') || 0);
    cached.tokens = JSON.parse(localStorage.getItem('fbx_tokens') || '[]');
  } catch {}
  return cached;
};
const cached = getCachedWallet();
import { fairbrix } from '../services/fairbrix.js';
import { useAuthStore } from '../services/auth.js';
import { fmtAmt, fmtUSD } from '../utils/format.js';
import { copyText } from '../utils/clipboard.js';
import { AddressBook } from '../services/addressbook.js';

// Simple token icon helper with cache-busting and base path support
const ICON_VER = (import.meta && import.meta.env && import.meta.env.VITE_ICON_VER) || '1';
const BASE = (() => {
  try {
    const b = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/';
    return String(b || '/').endsWith('/') ? String(b || '/') : String(b || '/') + '/';
  } catch { return '/'; }
})();
const tokenIconSrc = (sym) => {
  const s = String(sym || '').toUpperCase();
  if (s === 'FBX') return `${BASE}fbx.jpg?v=${ICON_VER}`;
  if (s === 'DOPE') return `${BASE}dopebrix.png?v=${ICON_VER}`;
  return '';
};

const TokenIcon = ({ symbol }) => {
  const [err, setErr] = useState(false);
  const src = err ? '' : tokenIconSrc(symbol);
  return (
    <div style={{width:28,height:28,borderRadius:8,overflow:'hidden'}}>
      {src ? (
        <img src={src} alt={String(symbol || '').toUpperCase()} onError={()=>setErr(true)} style={{width:'100%',height:'100%',objectFit:'cover'}} />
      ) : (
        <div style={{width:'100%',height:'100%',background:'#1c1f23',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>
          {String(symbol || 'F').toUpperCase()[0]}
        </div>
      )}
    </div>
  );
};

function Action({ icon, label, onClick }) {
  return (
    <div className="action" onClick={onClick}>
      {icon}
      <div>{label}</div>
    </div>
  );
}

export default function Wallet() {
  // Show fallback only if there is a real node connection error
  // Always show cached balances instantly, then update in background
  useEffect(() => {
    // Show cached instantly
    setBalance(cached.balance);
    setTokens(cached.tokens);
    setHoldings(cached.tokens);
    setAddress(cached.address);
    // Start background update
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      let addr = cached.address;
      try {
        // Try to resolve address (fast, local)
        addr = await resolveAddress();
        if (!cancelled) setAddress(addr);
        try { localStorage.setItem('fbx_addr', addr); } catch {}
      } catch {}
      // Try indexer for fast balance first
      let indexerTokens = null;
      try {
        if (addr) {
          const res = await fetch(`/api/indexer?path=${encodeURIComponent(`ext/getaddress/${addr}`)}`);
          if (res.ok) {
            const data = await res.json().catch(()=>null);
            if (data && (data.balance !== undefined)) {
              const b = Number(data.balance);
              if (!Number.isNaN(b)) {
                if (!cancelled) setBalance(b);
                try { localStorage.setItem('fbx_balance', String(b)); } catch {}
              }
            }
            // Try to get tokens from indexer if available
            if (data && Array.isArray(data.tokens)) {
              indexerTokens = data.tokens.map(t => ({ symbol: t.symbol, name: t.name || t.symbol, amount: Number(t.amount) || 0 }));
              if (!cancelled) { setTokens(indexerTokens); setHoldings(indexerTokens); }
              try { localStorage.setItem('fbx_tokens', JSON.stringify(indexerTokens)); } catch {}
            }
          }
        }
      } catch {}
      // If no tokens from indexer, fallback to node RPC
      if (!indexerTokens) {
        try {
          const h = await fairbrix.getHoldings(addr);
          if (Array.isArray(h) && h.length) {
            if (!cancelled) { setTokens(h); setHoldings(h); }
            try { localStorage.setItem('fbx_tokens', JSON.stringify(h)); } catch {}
            const f = h.find(x => x.symbol === 'FBX');
            if (f && typeof f.amount === 'number') {
              if (!cancelled) setBalance(Number(f.amount) || 0);
              try { localStorage.setItem('fbx_balance', String(Number(f.amount) || 0)); } catch {}
            }
          }
        } catch {}
      }
      // Price
      try {
        const p = await fairbrix.getFbxUsdPrice();
        if (!cancelled) setPriceUsd(Number(p) || 0);
        try { localStorage.setItem('fbx_price_usd', String(Number(p) || 0)); } catch {}
      } catch {}
      // Recent activity
      try {
        setTxLoading(true);
        const items = await fairbrix.getAddressTxs(addr, { start: 0, length: 10 });
        if (!cancelled) setTxs(items);
      } finally { setTxLoading(false); }
      setLoading(false);
      hasLoadedOnce.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Fallback UI removed as requested
  // DEBUG: Log Wallet.jsx render
  console.log('Wallet.jsx render');
  // Remove invalid try/catch and content assignment
  // If you want error boundary, use React error boundary or wrap specific async calls
  // Return wallet UI JSX directly below
  const [connectCountdown, setConnectCountdown] = useState(300);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, progress: 0, blocks: 0, headers: 0 });
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const keepAliveTimer = useRef(null);
  const { walletLabel } = useAuthStore();
  const [balance, setBalance] = useState(cached.balance);
  const [address, setAddress] = useState(cached.address);
  const [tokens, setTokens] = useState(cached.tokens);
  const [priceUsd, setPriceUsd] = useState(() => {
    const cachedPrice = Number(localStorage.getItem('fbx_price_usd'));
    return isNaN(cachedPrice) ? 0 : cachedPrice;
  });
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [diag, setDiag] = useState(null);
  const [sendSheet, setSendSheet] = useState(false);
  const [sendForm, setSendForm] = useState(false);
  const [confirmSheet, setConfirmSheet] = useState(false);
  const [est, setEst] = useState({ fee: 0, total: 0, ok: false });
  const [sending, setSending] = useState(false);
  const [addrCheck, setAddrCheck] = useState(''); // '', 'valid', 'invalid', 'unknown'
  const [sentSheet, setSentSheet] = useState(false);
  const [sentTxId, setSentTxId] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [receiveSheet, setReceiveSheet] = useState('');
  const [troubleshootSheet, setTroubleshootSheet] = useState(false);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixMsg, setFixMsg] = useState('');
  // ...existing code...
  const [txs, setTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [holdings, setHoldings] = useState(cached.tokens);
  const [addrValid, setAddrValid] = useState(null);
  const [height, setHeight] = useState(0);
  // REMOVE duplicate declaration
  const [primaryAsset, setPrimaryAsset] = useState('FBX');
  const [sendAsset, setSendAsset] = useState(null);
  const [signSheet, setSignSheet] = useState(false);
  const [signPass, setSignPass] = useState('');
  const [signBusy, setSignBusy] = useState(false);
  const [signErr, setSignErr] = useState('');
  const dopePrice = Number(import.meta.env.VITE_DOPE_PRICE_USD || 0);


  const resolveAddress = async () => {
    // Prefer locally generated unified wallet address if present, but validate it first
    try {
      const local = localStorage.getItem('fbx_addr');
      if (local) {
        try {
          const v = await fairbrix.validateAddress(local);
          if (v?.isvalid === true) return local;
        } catch {}
        // If invalid or node unavailable, fall through to re-derive from seed
      }
    } catch {}
    // If missing, derive from stored seed (works offline)
    try {
      const seedGetter = useAuthStore.getState && useAuthStore.getState().getSeed;
      const seed = seedGetter ? seedGetter() : '';
      if (seed) {
        const mod = await import('../lib/wallet/unifiedWallet.js');
        if (mod && mod.deriveFairbrixFromMnemonic) {
          const fbx = await mod.deriveFairbrixFromMnemonic(seed);
          if (fbx && fbx.address) {
            // Always surface the locally derived address for receive
            try { localStorage.setItem('fbx_addr', fbx.address); } catch {}
            return fbx.address;
          }
        }
      }
    } catch {}
    const label = walletLabel || 'pwa-wallet';
    let addr = '';
    try { await fairbrix.ensureWallet(); } catch {}
    try { addr = await fairbrix.getOrCreateAddress(label); } catch {}
    if (!addr) {
      try {
        const byLabel = await fairbrix.rpcRequest('getaddressesbylabel', [label]);
        const keys = Object.keys(byLabel || {});
        if (keys && keys.length) addr = keys[0];
      } catch {}
    }
    if (!addr) {
      // Final attempt: let node generate a default new address without label
      try { addr = await fairbrix.rpcRequest('getnewaddress', []); } catch {}
    }
    if (!addr) {
      try { addr = localStorage.getItem('fbrx_last_addr') || ''; } catch {}
    }
    if (addr) {
      try { localStorage.setItem('fbrx_last_addr', addr); } catch {}
    }
    return addr;
  };

  // ...existing code...
  const load = async () => {
    // Fetch sync status
    try {
      const info = await fairbrix.rpcRequest('getblockchaininfo');
      if (info && typeof info.blocks === 'number' && typeof info.headers === 'number') {
        const syncing = info.blocks < info.headers;
        const progress = info.verificationprogress || (info.blocks/info.headers);
        setSyncStatus({ syncing, progress, blocks: info.blocks, headers: info.headers });
      } else {
        setSyncStatus({ syncing: false, progress: 1, blocks: 0, headers: 0 });
      }
    } catch {
      setSyncStatus({ syncing: false, progress: 0, blocks: 0, headers: 0 });
    }
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    setLoadError("");
    try {
      // Address
      let addr = await resolveAddress();
      setAddress(addr);
      try { localStorage.setItem('fbx_addr', addr); } catch {}

      // Balance
      let bal = 0;
      try { bal = Number(await fairbrix.getBalance()) || 0; } catch (e) { setLoadError("Could not fetch balance"); }
      setBalance(bal);
      try { localStorage.setItem('fbx_balance', String(bal)); } catch {}

      // Price
      try {
        const p = await fairbrix.getFbxUsdPrice();
        setPriceUsd(Number(p) || 0);
        try { localStorage.setItem('fbx_price_usd', String(Number(p) || 0)); } catch {}
      } catch {}

      // Holdings ensure FBX present
      try {
        const h = await fairbrix.getHoldings(addr);
        const list = Array.isArray(h) && h.length ? h : [{ symbol: 'FBX', name: 'Fairbrix', amount: bal }];
        setHoldings(list); setTokens(list);
        try { localStorage.setItem('fbx_tokens', JSON.stringify(list)); } catch {}
        try { const f = list.find(x => x.symbol === 'FBX'); if (f && typeof f.amount === 'number') setBalance(Number(f.amount) || 0); } catch {}
      } catch {
        // Fallback to cached tokens if holdings fetch fails
        const cachedTokens = cached.tokens && cached.tokens.length ? cached.tokens : [{ symbol: 'FBX', name: 'Fairbrix', amount: bal }];
        setHoldings(cachedTokens); setTokens(cachedTokens);
        try { localStorage.setItem('fbx_tokens', JSON.stringify(cachedTokens)); } catch {}
      }

      // Recent activity
      try {
        setTxLoading(true);
        const items = await fairbrix.getAddressTxs(addr, { start: 0, length: 10 });
        setTxs(items);
      } finally { setTxLoading(false); }
    } catch (e) {
      setLoadError("Node or wallet unreachable. Please check your connection and try again.");
    } finally {
  setLoading(false);
  hasLoadedOnce.current = true;
    }
    return addr;
  };

  // Initial load: only run once when wallet mounts, not on tab change
  useEffect(() => {
    if (!hasLoadedOnce.current) {
      load();
    }
    // Only set hasLoadedOnce after first load
    return () => {};
  }, []);
  // Countdown timer for node connection
  useEffect(() => {
    let timer;
    if (loading && (!address || balance === 0)) {
      setConnectCountdown(300);
      timer = setInterval(() => {
        setConnectCountdown((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(timer);
          return 0;
        });
      }, 1000);
    } else {
      setConnectCountdown(0);
    }
    return () => clearInterval(timer);
  }, [loading, address, balance]);
  // Only show loading animation on first open

  // Auto-refresh: poll every 30s
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh on app resume/visibility
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('visibilitychange', onVisibility);
    return () => window.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keepalive health check every 30s
  useEffect(() => {
    keepAliveTimer.current = setInterval(() => {
      if (fairbrix && fairbrix.rpcHealth) fairbrix.rpcHealth().catch(()=>{});
    }, 30000);
    return () => clearInterval(keepAliveTimer.current);
  }, []);
    // Keepalive health check every 60s
    useEffect(() => {
      keepAliveTimer.current = setInterval(() => {
        if (fairbrix && fairbrix.rpcHealth) fairbrix.rpcHealth().catch(()=>{});
      }, 60000);
      return () => clearInterval(keepAliveTimer.current);
    }, []);
  // Debounced recipient validation in send form
  useEffect(() => {
    let t;
    if (!to) { setAddrCheck(''); return; }
    t = setTimeout(async () => {
      try {
        const v = await fairbrix.validateAddress(to);
        if (v?.isvalid === true) setAddrCheck('valid');
        else if (v?.error) setAddrCheck('unknown');
        else setAddrCheck('invalid');
      } catch { setAddrCheck('unknown'); }
    }, 350);
    return () => { try { clearTimeout(t); } catch {} };
  }, [to]);
  useEffect(() => {
    (async () => {
      // If node is still starting, wait briefly then reload to populate address/balance
      const ok = await fairbrix.waitForNode({ timeoutMs: 12000, intervalMs: 600 });
      if (ok) {
        const addr = await load();
        if (addr) setReceiveSheet('address');
      } else {
        try {
          const d = await fairbrix.diagnose();
          setDiag(d);
          if (!d?.ok) {
            if (d.code === 'unreachable') setStatus(`Node unreachable. Check proxy or local node.`);
            else if (d.code === 'wallet_disabled') setStatus(`Node wallet is disabled. Start your node with wallet support.`);
            else if (d.code === 'wallet_unavailable') setStatus(`No wallet loaded on node. Use createwallet or loadwallet.`);
            else if (d.code === 'unauthorized') setStatus(`Unauthorized to RPC. Check credentials.`);
            else setStatus(d.message || 'Node unavailable');
          } else { setStatus(''); }
        } catch (e) { setStatus(`Node unreachable: ${e?.message || 'unknown error'}`); }
        // Even if node unreachable, try to surface local address for receive
        try {
          const addr = await resolveAddress();
          if (addr) { setAddress(addr); setReceiveSheet('address'); }
        } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll block height and refresh balance/txs when it changes
  useEffect(() => {
    let timer;
    let last = 0;
    let cancelled = false;
    const tick = async () => {
      try {
        const h = await fairbrix.rpcHealth();
        if (h?.ok) {
          const best = Number(h.best) || 0;
          if (best !== last) {
            last = best; if (!cancelled) setHeight(best);
            // Refresh quick stats
            try { const bal = Number(await fairbrix.getBalance()) || 0; if (!cancelled) setBalance(bal); } catch {}
            try { const a = address || await resolveAddress(); if (!cancelled && !address && a) setAddress(a); const items = await fairbrix.getAddressTxs(a || address, { start: 0, length: 10 }); if (!cancelled) setTxs(items); } catch {}
            try { const hlds = await fairbrix.getHoldings(address || await resolveAddress()); if (!cancelled) { setHoldings(hlds); setTokens(hlds); } } catch {}
          }
        }
      } finally {
        timer = setTimeout(tick, 2000);
      }
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [address]);

  const handleSend = async () => {
    const sym = (sendAsset && sendAsset.symbol) || 'FBX';
    if (sym === 'DOPE') {
      setStatus('Broadcasting tokenâ€¦');
      try {
        const res = await fairbrix.transferDope({ toAddress: to, amount: Number(amount)||0 });
        const txid = res?.txid || '';
        setStatus(txid ? `Sent! TXID: ${txid}` : 'Transfer sent');
        setAmount(''); setTo('');
        await load();
        try { setSentTxId(txid || ''); setSentSheet(true); } catch {}
        return { ok: true, txid };
      } catch (e) {
        const msg = e?.message || 'Failed to send token';
        setStatus(msg);
        return { ok: false, error: msg };
      }
    }
    setStatus('Broadcastingâ€¦');
    try {
      const useProxy = !!(import.meta.env.VITE_FAIRBRIX_BROADCAST_URL || import.meta.env.VITE_FAIRBRIX_PROXY_URL);
      let txid = '';
      if (useProxy) {
        txid = await fairbrix.sendPayment(to, Number(amount));
      } else {
        txid = await fairbrix.sendToAddress(to, Number(amount));
      }
      setStatus(`Sent! TXID: ${txid}`);
      setAmount(''); setTo('');
      await load();
      try { setSentTxId(txid || ''); setSentSheet(true); } catch {}
      return { ok: true, txid };
    } catch (e) {
      const msg = e?.message || 'Failed to send';
      setStatus(msg);
      return { ok: false, error: msg };
    }
  };

  const handleStake = async () => {
    setStatus('Stakingâ€¦');
    try { const res = await fairbrix.stake(); setStatus(res?.message || 'Stake request sent'); }
    catch { setStatus('Stake unavailable'); }
  };

  // Spinner/loading state for balance and send form
    // Show wallet UI if node is connected, even if still loading data
    const isConnected = !loadError && (balance !== 0 || address);
    // Connecting card UI removed as requested

  return (
    <div className="grid">
      {/* Header metallic glow while loading and not connected */}
      {loading && !isConnected && (
        <div style={{textAlign:'center',margin:'8px 0'}}>
          <MetallicGlow>Starting node...</MetallicGlow>
        </div>
      )}
      {loading && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',margin:'8px auto',padding:'0',background:'rgba(30,30,40,0.98)',borderRadius:'6px',maxWidth:'160px',boxShadow:'0 1px 4px #0004',position:'relative',fontSize:'10px',height:'28px',minHeight:'28px'}}>
          <button style={{position:'absolute',top:2,right:2,width:18,height:18,background:'none',border:'none',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:700,lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}} aria-label="Dismiss" onClick={()=>setConnectCountdown(0)}>✕</button>
          <div style={{width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',marginRight:4}}>
            <img src="/dopebrix.png" alt="Loading..." style={{width:'18px',height:'18px',animation:'coin-flip 1.2s infinite cubic-bezier(.68,-0.55,.27,1.55)'}} />
          </div>
          <style>{`
            @keyframes coin-flip {
              0% { transform: rotateY(0deg); }
              50% { transform: rotateY(180deg); }
              100% { transform: rotateY(360deg); }
            }
            .glow {
              background: linear-gradient(90deg,#b8f0ff 0%,#e0eafc 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              color: transparent;
              animation: metallic-glow 2.2s linear infinite;
            }
            @keyframes metallic-glow {
              0% { filter: brightness(1.2) drop-shadow(0 0 6px #b8f0ff); }
              50% { filter: brightness(2) drop-shadow(0 0 12px #e0eafc); }
              100% { filter: brightness(1.2) drop-shadow(0 0 6px #b8f0ff); }
            }
          `}</style>
          <div className="glow" style={{fontWeight:800,fontSize:'11px',letterSpacing:1,marginRight:2}}>Starting…</div>
          <div style={{color:'#ffe7a6',fontWeight:500,fontSize:'10px',marginLeft:2}}>
            <span style={{fontWeight:800}}>{connectCountdown}</span>s
          </div>
        </div>
      )}
      {syncStatus.syncing && (
        <div className="card" style={{color:'#ffe7a6',background:'#2b2213',marginBottom:12}}>
          <b>Node is syncing…</b><br/>
          Blocks: {syncStatus.blocks} / {syncStatus.headers} ({(syncStatus.progress*100).toFixed(2)}%)
        </div>
      )}
      {/* Balance section without card wrapper */}
      <div className="muted">Total balance</div>
      {(() => {
        const fbx = Number(balance)||0;
        const dopeEntry = holdings.find(x=>x.symbol==='DOPE') || {};
        const dope = Number(dopeEntry.amount||0);
        const val = primaryAsset==='DOPE' ? dope : fbx;
        const usd = primaryAsset==='DOPE' ? (dopePrice||0) : (priceUsd||0);
        const usdValue = val * usd;
        // Calculate profit percent (example: compare to starting balance)
        const startingUsd = typeof window !== 'undefined' ? Number(localStorage.getItem('fbx_start_usd') || usdValue) : usdValue;
        const profit = usdValue - startingUsd;
        const profitPercent = startingUsd ? ((usdValue - startingUsd) / startingUsd) * 100 : 0;
        const profitColor = profitPercent > 0 ? '#32cd32' : (profitPercent < 0 ? '#ff3c3c' : '#aaa');
        return (
          <>
            <div style={{fontSize:'2.6rem', fontWeight:900, color:'#fff', margin:'12px 0 2px 0'}}>{fmtUSD(usdValue)}</div>
            <div style={{fontSize:'1.1rem', fontWeight:700, marginBottom:2, display:'flex', justifyContent:'center', gap:8}}>
              <span style={{color: profitColor}}>
                {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
              </span>
              <span style={{color: profitColor, fontWeight:500, fontSize:'0.95rem'}}>
                ({profit >= 0 ? '+' : ''}{fmtUSD(profit)})
              </span>
            </div>
            <button
              className="lime-retry-btn"
              style={{background:'none',color:'#32cd32',border:'none',fontWeight:700,fontSize:'1rem',margin:'4px 0',padding:'2px 8px',cursor:'pointer'}}
              onClick={async () => {
                setLoading(true);
                setLoadError("");
                try {
                  await load();
                } catch (e) {
                  setLoadError("Failed to reload balance");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Retry
            </button>
          </>
        );
      })()}
      {holdings.find(x=>x.symbol==='DOPE') && (
        <div className="tabbar" style={{marginTop:8}}>
          <button className={primaryAsset==='FBX'?'active':''} onClick={()=>setPrimaryAsset('FBX')}>FBX</button>
          <button className={primaryAsset==='DOPE'?'active':''} onClick={()=>setPrimaryAsset('DOPE')}>DOPE</button>
        </div>
      )}
      {/* Wallet address removed from balance section. Accessible via header or receive button. */}
      <div className="meta-row" style={{marginTop:8}}>
        {height ? <span className="pill mono">{`Height #${height}`}</span> : null}
      </div>
      <div className="actions" style={{flexWrap:'wrap',gap:'8px',justifyContent:'center',margin:'8px 0'}}>
        <Action label="Send" onClick={() => setSendSheet(true)} icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M4 12h12l-4-4 1.4-1.4L20.8 14l-7.4 7.4L12 20l4-4H4z"/></svg>} />
        <Action label="Receive" onClick={() => setReceiveSheet('menu')} icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M20 3H4a1 1 0 0 0-1 1v4h2V5h14v14h-3v2h4a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM3 16H1l4-6 4 6H7v5H5v-5z"/></svg>} />
        <Action label="Buy" onClick={()=>window.__setAppTab && window.__setAppTab('buy')} icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.2 14h9.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49-1.74-.99-3.58 6.49H8.1L5.25 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.1L7.2 14z"/></svg>} />
        <Action label="Stake" onClick={handleStake} icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 2 7l10 5 10-5-10-5zm0 7L2 4v13l10 5 10-5V4l-10 5z"/></svg>} />
        <Action label="Swap" onClick={()=>window.__setAppTab && window.__setAppTab('swap')} icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M4 12h12l-4-4 1.4-1.4L20.8 14l-7.4 7.4L12 20l4-4H4z"/></svg>} />
        <div className="action" style={{padding:'2px 8px',fontSize:'0.95rem'}} onClick={() => window.location.reload()}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.9-4h-2.02A7 7 0 0 0 12 22a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg>
          <div>Refresh</div>
        </div>
      </div>

      {/* Tokens label outside card */}
      <div style={{fontWeight:700, marginBottom:8}}>Tokens</div>
      <div className="card">
        <div className="list">
          {(!holdings || holdings.length === 0) && (
            <div className="muted">No tokens yet</div>
          )}
              {holdings && holdings.map((t, i) => (
            <div className="list-item" key={`${t.symbol}-${i}`} style={{cursor:'pointer'}} onClick={()=>{
              if (window.__setAppTab) window.__setAppTab('token', t.symbol);
            }}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <TokenIcon symbol={t.symbol} />
                <div>
                  <div style={{fontWeight:600}}>{t.name || t.symbol}</div>
                  <div className="muted" style={{fontSize:12}}>{t.symbol}</div>
                </div>
              </div>
              <div style={{fontWeight:700}}>{fmtAmt(t.amount)} {t.symbol}</div>
            </div>
          ))}
          {holdings && holdings.find(x=>x.symbol==='DOPE') && (
            <div className="list-item" onClick={()=>{ if (window.__setAppTab) window.__setAppTab('earn'); }}>
              <div>
                <div style={{fontWeight:700}}>Stake DOPE</div>
                <div className="muted" style={{fontSize:12}}>Open staking to lock DOPE and earn FBX</div>
              </div>
              <div className="muted">â†’</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity label outside card */}
      <div style={{fontWeight:700, marginBottom:8}}>Recent Activity</div>
      <div className="card">
        {!txLoading && (!txs || txs.length === 0) && (
          <div className="muted">No recent transactions</div>
        )}
        {txLoading && (
          <div className="muted">Loading...</div>
        )}
        {!txLoading && txs && txs.length > 0 && (
          <div className="list">
            {txs.slice(0, 4).map((t, i) => (
              <div key={t.txid || i} className="list-item">
                <div>
                  <div className="mono" title={t.txid}>{(t.txid || '').slice(0, 10)}...{(t.txid || '').slice(-6)}</div>
                  <div className="muted" style={{fontSize:12}}>{t.time ? new Date(t.time).toLocaleString() : ''}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:600}}>{t.amount ? `${fmtAmt(t.amount)} FBX` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* See more button/tab */}
        {!txLoading && txs && txs.length > 0 && (
          <div style={{textAlign:'right', marginTop:8}}>
            <button className="pill" style={{fontSize:'0.95rem', padding:'4px 12px'}} onClick={()=>{
              if (window.__setAppTab) window.__setAppTab('activity');
              else window.location.href = '/activity';
            }}>See more</button>
          </div>
        )}
      </div>

      {sendSheet && (
        <div className="sheet full">
          <div className="sheet-inner full">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>{sendForm ? `Send ${(sendAsset?.name||sendAsset?.symbol||'') || 'Fairbrix'}` : 'Send'}</div>
              <button className="pill" onClick={()=>{ setSendForm(false); setSendSheet(false); }}>âœ•</button>
            </div>
            {!sendForm && (
              <div className="list">
                {(tokens||[]).map((t,i)=> (
                  <div className="list-item" key={`s-${i}`} onClick={()=>{ setSendAsset(t); setSendForm(true); }}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <TokenIcon symbol={t.symbol} />
                      <div>
                        <div style={{fontWeight:700}}>{t.name||t.symbol}</div>
                        <div className="muted" style={{fontSize:12}}>{t.symbol}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="muted">{fmtAmt(Number(t.amount)||0)} {t.symbol}</div>
                      {t.symbol === 'FBX' && <div className="muted" style={{fontSize:12}}>{fmtUSD((Number(t.amount)||0) * (Number(priceUsd)||0))}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sendForm && (
              <div className="list">
                <div className="list-item">
                  <div>
                    <label className="label">Recipient address</label>
                    <input className="input" placeholder="f..." value={to} onChange={e=>{ setTo(e.target.value); setAddrCheck(''); }} autoComplete="off" />
                    {/* AddressBook recents suggestions */}
                    {(!to || to.length < 6) && AddressBook.getRecents().length > 0 && (
                      <div className="muted" style={{fontSize:12, marginTop:6}}>
                        Recent:
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                          {AddressBook.getRecents().map(addr => (
                            <span key={addr} className="pill" style={{cursor:'pointer'}} onClick={()=>{ setTo(addr); setAddrCheck(''); }}>{addr.slice(0,8)}...{addr.slice(-6)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!!to && (
                      <div className="muted" style={{fontSize:12, marginTop:6}}>
                        {addrCheck === 'valid' && 'Address looks valid on this node'}
                        {addrCheck === 'invalid' && 'Address is not valid on this node'}
                        {addrCheck === 'unknown' && 'Address not verified (node offline)'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="list-item">
                  <div style={{flex:1}}>
                    <label className="label">Amount {(sendAsset?.symbol) ? `(${sendAsset.symbol})` : '(FBX)'}</label>
                    <input className="input" inputMode="decimal" placeholder="0.0" value={amount} onChange={e=>setAmount(e.target.value)} disabled={loading || balance === null || typeof balance === 'undefined'} />
                    <div className="muted" style={{fontSize:12, marginTop:6}}>
                      {loading || balance === null || typeof balance === 'undefined' ? (
                        <span>Loading balance...</span>
                      ) : (
                        <>
                          Available: {fmtAmt(balance)} FBX â€¢ {fmtUSD((Number(balance)||0)*(Number(priceUsd)||0))}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-end'}}>
                    <button className="pill" onClick={()=>{ const max = (sendAsset && sendAsset.symbol !== 'FBX') ? (Number(sendAsset.amount)||0) : (Number(balance)||0); setAmount(String(max)); }} style={{whiteSpace:'nowrap'}} disabled={loading || balance === null || typeof balance === 'undefined'}>Max</button>
                  </div>
                </div>
                <div className="row" style={{marginTop:8}}>
                  <button className="cta" onClick={()=>{ setSendForm(false); }}>Back</button>
                  <button className="cta primary" onClick={async()=>{
                    if (loading || balance === null || typeof balance === 'undefined') return;
                    try {
                      setConfirmSheet(true);
                      if (!sendAsset || sendAsset.symbol === 'FBX') {
                        setEst({ fee: 0, total: Number(amount)||0, ok: false });
                        const r = await fairbrix.estimatePayment({ address: to, amount: Number(amount) });
                        setEst(r);
                      } else {
                        setEst({ ok: false, fee: 0, total: Number(amount)||0 });
                      }
                      // Save to address book recents
                      AddressBook.addRecent(to);
                    } catch {
                      setConfirmSheet(true);
                    }
                  }} disabled={loading || balance === null || typeof balance === 'undefined' || !(Number(amount)>0 && String(to||'').length>20) || addrCheck === 'invalid'}>{loading || balance === null || typeof balance === 'undefined' ? 'Loading balance...' : 'Send'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmSheet && (
        <div className="sheet full">
          <div className="sheet-inner full">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>Confirm Transaction</div>
              <button className="pill" onClick={()=>setConfirmSheet(false)}>âœ•</button>
            </div>
            <div className="list">
              <div className="list-item"><div><div className="label">To</div><div className="mono" style={{wordBreak:'break-all'}}>{to}</div></div></div>
              <div className="list-item">
                <div style={{display:'flex',justifyContent:'space-between',width:'100%'}}>
                  <div>
                    <div className="label">Amount</div>
                    <div>{fmtAmt(Number(amount)||0)} {(sendAsset?.symbol)||'FBX'}</div>
                    {(!sendAsset || sendAsset?.symbol === 'FBX') && (
                      <div className="muted" style={{fontSize:12}}>{fmtUSD((Number(amount)||0) * (Number(priceUsd)||0))}</div>
                    )}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="label">Estimated fee</div>
                    <div>{est?.ok ? `${fmtAmt(est.fee)} FBX` : 'â€”'}</div>
                    <div className="muted" style={{fontSize:12}}>{est?.ok ? fmtUSD((est.fee||0) * (Number(priceUsd)||0)) : ''}</div>
                  </div>
                </div>
              </div>
              <div className="list-item">
                <div className="row" style={{width:'100%'}}>
                  <button className="cta" onClick={()=>setConfirmSheet(false)}>Back</button>
                  <button className="cta primary" disabled={sending || loading || balance === null || typeof balance === 'undefined'} onClick={()=>{ setConfirmErr(''); setSignErr(''); setSignPass(''); setSignSheet(true); }}>{sending ? "Sending…" : (loading || balance === null || typeof balance === 'undefined' ? 'Loading balance...' : 'Approve & Send')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {signSheet && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>Sign Transaction</div>
              <button className="pill" onClick={()=>setSignSheet(false)}>✕</button>
            </div>
            <div className="list">
              {signErr && (
                <div className="list-item">
                  <div className="alert" style={{background:'#3a2424', color:'#ffd7d7', border:'1px solid #5b3a3a'}}>{signErr}</div>
                </div>
              )}
              <div className="list-item">
                <div className="row" style={{width:'100%'}}>
                  <button className="cta" onClick={()=>setSignSheet(false)}>Cancel</button>
                  <button className="cta primary" disabled={signBusy} onClick={async()=>{
                    setSignBusy(true);
                    try {
                      // Preflight diagnostics before signing/broadcasting
                      let pf;
                      try {
                        pf = await fairbrix.preflightSend({ amount: Number(amount)||0, fromAddress: address||'' });
                        if (!pf?.ok) {
                          setSignErr(pf?.message || 'Preflight failed');
                          setSignBusy(false);
                          return;
                        }
                      } catch (e) {
                        setSignErr(e?.message || 'Preflight exception');
                        setSignBusy(false);
                        return;
                      }
                      let res;
                      try {
                        res = await handleSend();
                      } catch (e) {
                        setConfirmErr(e?.message || 'Send exception');
                        setSignErr(e?.message || 'Send exception');
                        setSignBusy(false);
                        return;
                      }
                      if (res?.ok) {
                        setConfirmSheet(false); setSendForm(false); setSendSheet(false); setSignSheet(false); setConfirmErr(''); setSignErr('');
                      } else {
                        setConfirmErr(res?.error || 'Failed to send');
                        setSignErr(res?.error || 'Failed to send');
                      }
                    } finally {
                      setSignBusy(false);
                    }
                  }}>{signBusy ? 'Sending…' : 'Sign & Send'}</button>
                </div>
              </div>
              {/* Fallback: always show last error if present */}
              {(signErr || confirmErr) && (
                <div className="list-item">
                  <div className="alert" style={{background:'#3a2424', color:'#ffd7d7', border:'1px solid #5b3a3a'}}>
                    {signErr || confirmErr}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sentSheet && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>Transaction Sent</div>
              <button className="pill" onClick={()=>setSentSheet(false)}>âœ•</button>
            </div>
            {confirmErr && (
              <div className="alert" style={{background:'#3a2424', color:'#ffd7d7', border:'1px solid #5b3a3a'}}>{confirmErr}</div>
            )}
            <div className="list">
              <div className="list-item">
                <div>
                  <div className="label">TXID</div>
                  <div className="mono" style={{wordBreak:'break-all'}}>{sentTxId || 'â€”'}</div>
                </div>
                <button className="pill" onClick={async()=>{ const ok = await copyText(sentTxId||''); setStatus(ok?'TXID copied':'Copy failed'); }}>Copy</button>
              </div>
              <div className="list-item">
                <button className="cta" onClick={()=>setSentSheet(false)}>Done</button>
                <a className="cta" href={`${(import.meta.env.VITE_INDEXER_API_URL||'https://fairbrixscan.com').replace(/\/$/,'')}/tx/${sentTxId}`} target="_blank" rel="noreferrer">View on Explorer</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {receiveSheet === 'menu' && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header">
              <div style={{fontWeight:900, fontSize:18}}>Receive crypto and collectibles</div>
              <button className="pill" onClick={()=>setReceiveSheet('')}>âœ•</button>
            </div>
            <div className="alert" style={{background:'#2b2213', color:'#ffd7a6'}}>âš  Wallet not backed up</div>
            <div className="spacer"/>
            <div className="list">
              <div className="list-item" onClick={async()=>{ const a = await resolveAddress(); setAddress(a); setReceiveSheet('address'); }}>
                <div>
                  <div style={{fontWeight:700}}>Coins and tokens</div>
                  <div className="muted" style={{fontSize:12}}>Receive Fairbrix and Runes tokens.</div>
                </div>
                <div className="muted">â€º</div>
              </div>
              <div className="list-item">
                <div>
                  <div style={{fontWeight:700}}>Collectibles</div>
                  <div className="muted" style={{fontSize:12}}>Receive Dopels.</div>
                </div>
                <div className="muted">â€º</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {receiveSheet === 'address' && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>Your address</div>
              <button className="pill" onClick={()=>setReceiveSheet('')}>âœ•</button>
            </div>
            <div className="spacer"/>
            <div className="mono" style={{wordBreak:'break-all'}}>{address || 'No address available'}</div>
            <div className="spacer"/>
            <button className="cta" onClick={async()=>{
              let addr = address;
              if (!addr) { addr = await resolveAddress(); setAddress(addr); }
              const ok = await copyText(addr);
              setStatus(ok? 'Address copied' : 'Copy failed');
            }}>Copy address</button>
          </div>
        </div>
      )}

      {status && (
        <div className="card" style={{color:'#cbbdff', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>{status}</div>
          {diag && diag.ok === false && (
            <button className="pill" onClick={()=>{ setTroubleshootSheet(true); setFixMsg(''); }}>
              Fix it
            </button>
          )}
        </div>
      )}

      {troubleshootSheet && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="sheet-header">
              <div style={{fontWeight:800}}>Troubleshoot Node</div>
              <button className="pill" onClick={()=>{ if (!fixBusy) setTroubleshootSheet(false); }}>âœ•</button>
            </div>
            <div className="muted" style={{marginBottom:8}}>
              {diag?.message || 'Diagnosing node and walletâ€¦'}
            </div>
            {diag?.code === 'unreachable' && (
              <div style={{display:'grid', gap:8}}>
                <div>â€¢ For local dev, leave proxy blank and start the bundled node: <span className="mono">npm run node</span></div>
                <div>â€¢ If using proxy (/api), set <span className="mono">UPSTREAM_RPC_URL</span> and credentials on Vercel.</div>
              </div>
            )}
            {diag?.code === 'wallet_disabled' && (
              <div>Node wallet is disabled. Start your node with wallet support (omit -disablewallet).</div>
            )}
            {diag?.code === 'wallet_unavailable' && (
              <div>No wallet loaded on node. You can try to create/load it now.</div>
            )}
            {diag?.code === 'unauthorized' && (
              <div>Unauthorized. Check RPC user/pass or API token settings.</div>
            )}
            <div className="row" style={{marginTop:12, gap:8, flexWrap:'wrap'}}>
              <button className="pill" disabled={fixBusy} onClick={async()=>{
                setFixBusy(true); setFixMsg('');
                try {
                  const d = await fairbrix.diagnose(); setDiag(d);
                  if (d?.ok) { setFixMsg('Node OK'); setStatus(''); }
                  else setFixMsg(d.message || 'Node unavailable');
                } catch (e) { setFixMsg(e?.message || 'Failed'); }
                finally { setFixBusy(false); }
              }}>Retry diagnose</button>
              {diag?.code === 'wallet_unavailable' && (
                <button className="pill" disabled={fixBusy} onClick={async()=>{
                  setFixBusy(true); setFixMsg('');
                  try {
                    await fairbrix.ensureWallet();
                    const d2 = await fairbrix.diagnose(); setDiag(d2);
                    if (d2?.ok) { setFixMsg('Wallet created/loaded'); setStatus(''); }
                    else setFixMsg(d2.message || 'Still unavailable');
                  } catch (e) { setFixMsg(e?.message || 'Failed to create/load wallet'); }
                  finally { setFixBusy(false); }
                }}>Create/Load wallet</button>
              )}
              <button className="pill" disabled={fixBusy} onClick={async()=>{
                setFixBusy(true); setFixMsg('');
                try {
                  // Decrypt WIF from storage and import into node wallet
                  const mod = await import('../lib/wallet/unifiedWallet.js');
                  const wif = await (mod.decryptWifFromStorage ? mod.decryptWifFromStorage() : Promise.resolve(''));
                  if (!wif) throw new Error('No WIF available. Unlock or create wallet first.');
                  try { await fairbrix.ensureWallet(); } catch {}
                  await fairbrix.importPrivKey(wif, 'local', false);
                  setFixMsg('Private key imported to node wallet');
                } catch (e) { setFixMsg(e?.message || 'Import failed'); }
                finally { setFixBusy(false); }
              }}>Import my key</button>
            </div>
            {fixMsg && <div className="muted" style={{marginTop:8}}>{fixMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}




