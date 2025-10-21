import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../services/auth.js';

export default function Security() {
  const auth = useAuthStore();
  const [sheet, setSheet] = useState(false);
  const [pin, setPin] = useState('');
  const [stage, setStage] = useState('idle'); // idle | keypad | reveal
  const [showSeed, setShowSeed] = useState(false);
  const seed = auth.getSeed();
  const weak = useMemo(() => {
    try {
      const parts = String(seed || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length !== 12) return false;
      const s = new Set(parts.map(w => w.toLowerCase()));
      return s.size === 1;
    } catch { return false; }
  }, [seed]);

  const back = () => { if (window.__setAppTab) window.__setAppTab('settings'); };

  const openManualBackup = () => { setStage('keypad'); setSheet(true); };
  const addDigit = (d) => { if (pin.length<6) setPin(pin + d); };
  const delDigit = () => setPin(pin.slice(0,-1));
  const clear = () => setPin('');
  const verifyPin = async () => {
    const ok = await auth.verifyPasscode(pin);
    if (ok) { setStage('reveal'); setPin(''); }
  };

  const downloadBackup = async () => {
    // Simple plaintext seed export (for demo). For production, encrypt with passcode.
    const data = { wallet: auth.walletLabel || 'dope', seed };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dope-wallet-backup.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // Determine if backup alert should show: not backed up AND user has been active
  // For demo, "active" means wallet unlocked and seed used
  const showBackupAlert = !auth.seedBacked && auth.isUnlocked;

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:28}}>Security</div>
      </div>

      <div className="card">
        {showBackupAlert && (
          <div className="alert">⚠ Wallet not backed up</div>
        )}
        <div className="spacer"/>
        <div className="list">
          <div className="list-item" onClick={downloadBackup}>
            <div>
              <div style={{fontWeight:700}}>iCloud / Drive backup</div>
              <div className="muted" style={{fontSize:12}}>Save an encrypted backup to your cloud storage.</div>
            </div>
            <div className="muted">›</div>
          </div>
          <div className="list-item" onClick={openManualBackup}>
            <div>
              <div style={{fontWeight:700}}>Manual backup</div>
              <div className="muted" style={{fontSize:12}}>Reveal and write down your 12‑word seed phrase.</div>
            </div>
            <div className="muted">›</div>
          </div>
        </div>
      </div>

      {weak && (
        <div className="card" style={{background:'#2b1c1c', borderColor:'#573232'}}>
          <div style={{fontWeight:800, marginBottom:6}}>Weak seed detected</div>
          <div className="muted" style={{marginBottom:10}}>Your current 12 words appear identical. Generate a new secure seed. This changes your receive address; keep your old seed safe to access existing funds.</div>
          <button className="cta danger" onClick={async ()=>{
            try {
              await auth.regenerateSeed();
              alert('New seed generated. Open Manual backup to reveal and write it down. Your previous seed remains valid for old funds.');
            } catch (e) {
              alert(e?.message || 'Failed to generate new seed');
            }
          }}>Generate new secure seed</button>
        </div>
      )}

      {sheet && (
        <div className="sheet">
          <div className="sheet-inner">
            {stage === 'keypad' && (
              <>
                <div className="sheet-header"><div style={{fontWeight:800}}>Enter PIN to unlock wallet</div><button className="pill" onClick={()=>setSheet(false)}>✕</button></div>
                <div className="dots" style={{justifyContent:'center'}}>
                  {[0,1,2,3,4,5].map(i => (<span key={i} className={`dot ${i < pin.length ? 'filled' : ''}`}></span>))}
                </div>
                <div className="keypad">
                  {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} className="key" onClick={()=>addDigit(String(n))}>{n}</button>))}
                  <button className="key" onClick={clear}>⌫</button>
                  <button className="key" onClick={()=>addDigit('0')}>0</button>
                  <button className="key" onClick={delDigit}>←</button>
                </div>
                <div className="spacer"/>
                <button className="cta primary" onClick={verifyPin} disabled={pin.length<4}>Unlock</button>
              </>
            )}
            {stage === 'reveal' && (
              <>
                <div className="sheet-header"><div style={{fontWeight:800}}>Backup Wallet</div><button className="pill" onClick={()=>setSheet(false)}>✕</button></div>
                <div className="muted">Write down your seed phrase and keep it private.</div>
                <div className="spacer"/>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
                  {(seed||'').split(' ').map((w,i)=> (
                    <div key={i} className="card" style={{padding:'8px 10px', textAlign:'center'}}>
                      <div className="muted" style={{fontSize:12}}>{i+1}.</div>
                      <div style={{fontWeight:700}}>{showSeed ? w : '••••••'}</div>
                    </div>
                  ))}
                </div>
                <div className="spacer"/>
                <div className="row">
                  <button className="cta" onClick={()=>setShowSeed(!showSeed)}>{showSeed ? 'Hide' : 'Reveal'}</button>
                  <button className="cta" onClick={()=>{ auth.setSeedBacked(true); setSheet(false); }}>Verify</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
