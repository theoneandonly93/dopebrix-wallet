// Error boundary for runtime errors
import React, { useState, useEffect } from 'react';
import { useAuthStore } from './services/auth.js';
import Login from './pages/Login.jsx';
// import MaintenanceFallback from './components/MaintenanceFallback.jsx';
export class SafeBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? <div style={{color:'#ff3c3c',padding:'32px'}}>App crashed. <button onClick={()=>window.location.reload()}>Reload</button></div> : this.props.children;
  }
}

export default function App() {
  // DEBUG: Log tab and tabArgs on every render
  // ...existing code...
  const { isUnlocked, initFromStorage, walletLabel, seedBacked, setSeedBacked } = useAuthStore();
  const [tab, setTab] = useState('wallet');
  const [tabArgs, setTabArgs] = useState([]);
  const [splash, setSplash] = useState(true);
  const [appError, setAppError] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ ok: true });

  useEffect(() => {
    initFromStorage();
    const t = setTimeout(()=>setSplash(false), 900);
    window.__setAppTab = (tabName, ...args) => {
      setTab(tabName);
      setTabArgs(args);
      window.__tabArgs = args;
      if (window.__setTabArgs) window.__setTabArgs(args);
    };
    return () => { try { delete window.__setAppTab; delete window.__tabArgs; delete window.__setTabArgs; } catch {} };
  }, [setTab]);

  useEffect(() => {
    if (tab !== 'token') setTabArgs([]);
  }, [tab]);

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setBackendStatus(data);
      } catch {
        setBackendStatus({ ok: false });
      }
    }
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Pass tabArgs to dynamic tab, with fallback to wallet
  let Active;
  try {
    if (tab === 'token') {
      Active = () => <TokenDetailTab symbol={tabArgs[0] || 'FBX'} />;
    } else {
      const TabComponent = TABS[tab] || Wallet;
      Active = () => <TabComponent tabArgs={tabArgs} />;
    }
  } catch (e) {
    Active = () => <Wallet tabArgs={[]} />;
  }

  // Show smart fallback if backend is down or syncing
  if (!backendStatus.ok || backendStatus.syncing) {
  // MaintenanceFallback removed; optionally show nothing or a minimal error
  return null;
  }

  if (!isUnlocked) {
    return <Login onSuccess={() => {}} />;
  }

  if (!seedBacked) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand"><img src="/dopebrix.png" alt="DopeBrix" /><div className="account">Welcome</div></div>
          <NodeStatus />
          <div />
        </header>
        <main className="app-main">
          <Onboarding onDone={() => setSeedBacked(true)} />
        </main>
      </div>
    );
  }

  // If not crashed, not onboarding, and not locked, always show Wallet UI
  // ...existing code...

  return (
    <div className="app-shell">
      {splash && (
        <div style={{position:'fixed',inset:0,display:'grid',placeItems:'center',background:'#0b0d10',zIndex:100000}}>
          <div style={{display:'grid',justifyItems:'center',gap:10}}>
            <img src="/dopebrix.png" alt="DopeBrix" style={{width:64,height:64,borderRadius:16,animation:'pulse 0.9s ease-in-out infinite alternate'}} />
            <div className="muted">Loading...</div>
          </div>
        </div>
      )}
      <header className="app-header">
        <div className="brand" onClick={() => window.__setAppTab && window.__setAppTab('accounts')} style={{cursor:'pointer'}}>
          <img src="/dopebrix.png" alt="DopeBrix" />
          <ActiveAccountLabel />
        </div>
        <NodeStatus />
        <div className="hdr-icons">
          <span className="icon-btn" title="Copy" onClick={async()=>{
            try {
              let addr = '';
              try { await fairbrix.ensureWallet(); } catch {}
              try { addr = await fairbrix.getOrCreateAddress(walletLabel || 'pwa-wallet'); } catch {}
              if (!addr) { try { addr = await fairbrix.rpcRequest('getnewaddress', []); } catch {} }
              if (!addr) { try { addr = localStorage.getItem('fbrx_last_addr') || ''; } catch {} }
              const ok = await copyText(addr || '');
              console.log(ok ? 'Address copied' : 'Copy failed');
            } catch (e) { console.warn('copy failed', e); }
          }}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></span>
          <span className="icon-btn" title="QR" onClick={()=>window.__setAppTab && window.__setAppTab('scanqr')}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6 6h2v2h-2v-2zm4 0h6v6h-6v-6zm2 2v2h2v-2h-2zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 4h2v2h-2v-2zm2-2h2v2h-2v-2zm0-2h2v2h-2v-2z"/></svg></span>
          <span className="icon-btn" title="Settings" onClick={()=>window.__setAppTab && window.__setAppTab('settings')}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.027 7.027 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36-2.54c-.58-.22-1.13-.52-1.63-.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 7.84a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.41 1.05.74 1.63.94l.36-2.54c.05.25.26.42.5.42h3.84c.25 0 .46-.17.5-.42l.36-2.54c.58-.22 1.13-.52 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg></span>
        </div>
      </header>
      <main className="app-main">
        <Active />
      </main>
      <BottomNav value={tab} onChange={tabName => {
        if (window.__setAppTab) window.__setAppTab(tabName);
        else setTab(tabName);
      }} />
    </div>
  );
}

function ActiveAccountLabel() {
  const { accounts, activeIndex, init } = useAccounts();
  useEffect(() => { init(); }, [init]);
  const name = (accounts[activeIndex]?.label) || 'Account 1';
  return <div className="account">{name}</div>;
}