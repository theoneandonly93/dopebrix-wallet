import React, { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Login from './pages/Login.jsx';
import Wallet from './pages/Wallet.jsx';
import Collectibles from './pages/Collectibles.jsx';
import Earn from './pages/Earn.jsx';
import Activity from './pages/Activity.jsx';
import Explore from './pages/Explore.jsx';
import DopeDex from './pages/DopeDex.jsx';
import Accounts from './pages/Accounts.jsx';
import { useAccounts } from './services/accounts.js';
import Buy from './pages/Buy.jsx';
import Swap from './pages/Swap.jsx';
import DopaMeme from './pages/DopaMeme.jsx';
import ScanQR from './pages/ScanQR.jsx';
import Settings from './pages/Settings.jsx';
import Preferences from './pages/Preferences.jsx';
import ExplorerPrefs from './pages/ExplorerPrefs.jsx';
import Networks from './pages/Networks.jsx';
import Security from './pages/Security.jsx';
import About from './pages/About.jsx';
import Support from './pages/Support.jsx';
import ConnectedApps from './pages/ConnectedApps.jsx';
import AddressBook from './pages/AddressBook.jsx';
import { fairbrix } from './services/fairbrix.js';
import { copyText } from './utils/clipboard.js';
import Create from './pages/Create.jsx';
import { useAuthStore } from './services/auth.js';
import NodeStatus from './components/NodeStatus.jsx';
import Onboarding from './pages/Onboarding.jsx';

const TABS = {
  wallet: Wallet,
  collectibles: Collectibles,
  earn: Earn,
  activity: Activity,
  explore: Explore,
  dopedex: DopeDex,
  create: Create,
  accounts: Accounts,
  buy: Buy,
  swap: Swap,
  dopameme: DopaMeme,
  scanqr: ScanQR,
  settings: Settings,
  prefs: Preferences,
  prefs_explorer: ExplorerPrefs,
  networks: Networks,
  security: Security,
  about: About,
  support: Support,
  connected: ConnectedApps,
  addressbook: AddressBook,
};

export default function App() {
  const { isUnlocked, initFromStorage, walletLabel, seedBacked, setSeedBacked } = useAuthStore();
  const [tab, setTab] = useState('wallet');
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    initFromStorage();
    const t = setTimeout(()=>setSplash(false), 900);
    return ()=>clearTimeout(t);
  }, [initFromStorage]);

  // Expose simple global for in-app navigation from pages (e.g., Explore)
  useEffect(() => {
    window.__setAppTab = setTab;
    return () => { try { delete window.__setAppTab; } catch {} };
  }, [setTab]);

  if (!isUnlocked) {
    return <Login onSuccess={() => {}} />;
  }

  // First-login flow: run onboarding until seed is marked as backed up
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

  const Active = TABS[tab] ?? Wallet;

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
        <div className="brand" onClick={() => setTab('accounts')} style={{cursor:'pointer'}}>
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
          <span className="icon-btn" title="QR" onClick={()=>setTab('scanqr')}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6 6h2v2h-2v-2zm4 0h6v6h-6v-6zm2 2v2h2v-2h-2zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 4h2v2h-2v-2zm2-2h2v2h-2v-2zm0-2h2v2h-2v-2z"/></svg></span>
          <span className="icon-btn" title="Settings" onClick={()=>setTab('settings')}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.027 7.027 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 7.84a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.41 1.05.74 1.63.94l.36 2.54c.05.25.26.42.5.42h3.84c.25 0 .46-.17.5-.42l.36-2.54c.58-.22 1.13-.52 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg></span>
        </div>
      </header>

      <main className="app-main">
        <Active />
      </main>

      <BottomNav value={tab} onChange={setTab} />
    </div>
  );
}

function ActiveAccountLabel() {
  const { accounts, activeIndex, init } = useAccounts();
  useEffect(() => { init(); }, [init]);
  const name = (accounts[activeIndex]?.label) || 'Account 1';
  return <div className="account">{name}</div>;
}
