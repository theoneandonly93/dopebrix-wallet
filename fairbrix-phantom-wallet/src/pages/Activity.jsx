import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';
import { useAuthStore } from '../services/auth.js';
import { fmtAmt } from '../utils/format.js';

export default function Activity() {
  const { walletLabel } = useAuthStore();
  const [address, setAddress] = useState('');
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const addr = await fairbrix.getOrCreateAddress(walletLabel || 'pwa-wallet');
        setAddress(addr);
        const list = await fairbrix.getAddressTxs(addr, { start: 0, length: 20 });
        setTxs(list);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid">
      <div className="card">
        <div style={{fontWeight:800, fontSize:22}}>Transactions</div>
        <div className="spacer"/>
        <div className="muted mono" style={{fontSize:12, wordBreak:'break-all'}}>{address}</div>
        <div className="spacer"/>
        {loading && <div className="muted">Loading...</div>}
        {!loading && !txs.length && (
          <div className="center" style={{padding:'40px 0'}}>
            <div className="muted" style={{fontSize:18, fontWeight:700}}>No transactions yet</div>
            <div className="muted" style={{opacity:0.8}}>Your account transaction history will appear here.</div>
          </div>
        )}
        {!loading && txs.length > 0 && (
          <div className="list">
            {txs.map((t, i) => (
              <div className="list-item" key={t.txid || i}>
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
      </div>
    </div>
  );
}
