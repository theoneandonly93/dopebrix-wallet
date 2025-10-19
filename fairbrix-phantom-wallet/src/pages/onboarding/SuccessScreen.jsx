import React, { useEffect, useState } from 'react';
import { fairbrix } from '../../services/fairbrix.js';
import { decryptWifFromStorage } from '../../lib/wallet/unifiedWallet.js';
import { useAuthStore } from '../../services/auth.js';

export default function SuccessScreen({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [fbx, setFbx] = useState(typeof localStorage !== 'undefined' ? (localStorage.getItem('fbx_addr') || '') : '');
  const [dope, setDope] = useState(typeof localStorage !== 'undefined' ? (localStorage.getItem('dope_addr') || '') : '');

  useEffect(() => {
    (async () => {
      if (!fbx) {
        try {
          const seedGetter = useAuthStore.getState && useAuthStore.getState().getSeed;
          const seed = seedGetter ? seedGetter() : (localStorage.getItem('seed') || '');
          if (seed) {
            const mod = await import('../../lib/wallet/unifiedWallet.js');
            const f = await mod.deriveFairbrixFromMnemonic(seed);
            if (f?.address) {
              setFbx(f.address);
              try { localStorage.setItem('fbx_addr', f.address); } catch {}
              setDope(f.address);
              try { localStorage.setItem('dope_addr', f.address); } catch {}
            }
          }
        } catch {}
      }
    })();
  }, [fbx]);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Wallet Ready ✅</div>
      <div className="muted" style={{ marginBottom: 12 }}>Both networks are linked to your key.</div>
      <div style={{ background:'#101316', border:'1px solid #23272d', borderRadius:12, padding:12, textAlign:'left' }}>
        <p><b>Fairbrix (FBX):</b> <span className="mono" style={{wordBreak:'break-all'}}>{fbx}</span></p>
        <p><b>Dopelganga (DOPE):</b> <span className="mono" style={{wordBreak:'break-all'}}>{dope}</span></p>
      </div>
      <div className="muted" style={{ marginTop: 12 }}>You can view balances and start staking right away.</div>
      <div className="spacer"/>
      <button className="cta primary" onClick={async()=>{
        setBusy(true);
        try {
          const wif = await decryptWifFromStorage();
          if (wif) {
            try { await fairbrix.importPrivKey(wif, 'unified'); } catch {}
          }
        } finally { setBusy(false); }
        onDone && onDone();
      }}>{busy ? 'Finishing…' : 'Open Wallet'}</button>
    </div>
  );
}
