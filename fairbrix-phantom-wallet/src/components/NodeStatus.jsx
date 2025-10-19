import React, { useEffect, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function NodeStatus() {
  const [state, setState] = useState({ ok: false, best: 0, chain: '', error: '', loading: true });

  useEffect(() => {
    let timer;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fairbrix.rpcHealth();
        let chain = '';
        if (r?.ok) {
          try { const info = await fairbrix.rpcRequest('getblockchaininfo', []); chain = (info && info.chain) || ''; } catch {}
        }
        if (!cancelled) setState({ ok: !!r?.ok, best: Number(r?.best)||0, chain, error: r?.error || '', loading: false });
      } catch (e) {
        if (!cancelled) setState({ ok: false, best: 0, chain: '', error: e?.message || 'unreachable', loading: false });
      }
      timer = setTimeout(poll, 1500);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const color = state.loading ? '#a3a3a3' : (state.ok ? '#22c55e' : '#ef4444');
  const net = state.chain ? (state.chain === 'main' ? 'Mainnet' : state.chain) : '';
  const label = state.loading ? 'Starting…' : (state.ok ? `Connected #${state.best}${net ? ` • ${net}` : ''}` : 'Offline');
  const title = state.ok ? `Block height: ${state.best}` : (state.error || 'Node unreachable');

  return (
    <div className="node-status" title={title} style={{display:'inline-flex',alignItems:'center',gap:6,marginRight:8}}>
      <span style={{width:8,height:8,borderRadius:10,background:color,display:'inline-block'}}/>
      <span className="muted" style={{fontSize:12}}>{label}</span>
    </div>
  );
}
