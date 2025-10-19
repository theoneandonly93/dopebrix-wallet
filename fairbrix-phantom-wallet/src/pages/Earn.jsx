import React, { useEffect, useMemo, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';
import { fetchStakingStats, stakeDope, unstakeDope, claimFbx } from '../services/staking.js';
import Sparkline from '../components/Sparkline.jsx';
import LockProgress from '../components/LockProgress.jsx';

export default function Earn() {
  const [status, setStatus] = useState('');
  const [address, setAddress] = useState('');
  const [height, setHeight] = useState(0);
  const [amount, setAmount] = useState('');
  const [pool, setPool] = useState({ total_staked: 0, pool: {}, payouts: [] });

  const my = useMemo(() => (pool.pool && address) ? pool.pool[address] : null, [pool, address]);

  useEffect(() => {
    (async () => {
      try { await fairbrix.ensureWallet(); } catch {}
      try { const addr = await fairbrix.getOrCreateAddress('pwa-wallet'); setAddress(addr); } catch {}
      try { const h = await fairbrix.rpcRequest('getblockcount'); setHeight(Number(h)||0); } catch {}
      try { const p = await fetchStakingStats(); setPool(p); } catch {}
    })();
    const t = setInterval(async () => {
      try { const h = await fairbrix.rpcRequest('getblockcount'); setHeight(Number(h)||0); } catch {}
      try { const p = await fetchStakingStats(); setPool(p); } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const onStake = async () => {
    if (!amount || !address) return;
    setStatus('Staking…');
    try {
      const r = await stakeDope(address, Number(amount), Number(height));
      setStatus(r?.ok ? 'Staked' : (r?.error || 'Failed'));
      const p = await fetchStakingStats(); setPool(p);
      setAmount('');
    } catch (e) { setStatus(e?.message || 'Failed'); }
  };
  const onUnstake = async () => {
    if (!address) return;
    setStatus('Unstaking…');
    try {
      const r = await unstakeDope(address, Number(height));
      setStatus(r?.ok ? 'Unstaked' : (r?.error || 'Failed'));
      const p = await fetchStakingStats(); setPool(p);
    } catch (e) { setStatus(e?.message || 'Failed'); }
  };
  const onClaim = async () => {
    if (!address) return;
    setStatus('Claiming…');
    try {
      const r = await claimFbx(address);
      setStatus((r && typeof r.claimed_fbx !== 'undefined') ? `Claimed ${Number(r.claimed_fbx).toFixed(8)} FBX` : (r?.error || 'Failed'));
      const p = await fetchStakingStats(); setPool(p);
    } catch (e) { setStatus(e?.message || 'Failed'); }
  };

  const totalStaked = Number(pool.total_staked || 0);
  const totalFbxDistributed = (pool.payouts||[]).reduce((s,p)=>s+Number(p.fbx_total||p.distributed||0), 0);
  const apy = totalStaked > 0 ? ((totalFbxDistributed / totalStaked) * 365) * 100 : 0; // rough proxy
  const lockLeft = my ? Math.max(0, Number(my.locked_until||0) - Number(height||0)) : 0;
  const lockPct = my && my.locked_until ? Math.min(100, Math.max(0, (1 - (lockLeft/720)) * 100)) : 0;
  const minsLeft = (lockLeft * 5) / 60; // assuming 5-second blocks

  return (
    <div className="grid">
      <div className="card earn-hero">
        <div className="earn-title">Stake DOPE, Earn FBX</div>
        <div className="earn-sub">Lock your DOPE to earn a share of FBX fees from Proof‑of‑Commit anchors.</div>

        <div className="earn-metrics">
          <div className="metric">
            <div className="metric-label">TOTAL DOPE STAKED</div>
            <div className="metric-value">{totalStaked.toLocaleString()}</div>
          </div>
          <div className="metric">
            <div className="metric-label">LAST 5 PAYOUTS</div>
            <div className="metric-value">{Number(totalFbxDistributed).toFixed(8)} FBX</div>
          </div>
          <div className="metric">
            <div className="metric-label">EST. APY</div>
            <div className="metric-value">{apy.toFixed(2)}%</div>
          </div>
          <div className="metric">
            <div className="metric-label">CURRENT HEIGHT</div>
            <div className="metric-value">{height}</div>
          </div>
        </div>

        <div className="divider"/>

        <div style={{ marginTop: 8 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>FBX payout trend</div>
          <Sparkline payouts={pool.payouts} />
        </div>

        <div className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div className="metric-label">My stake</div>
            <div className="metric-value">{my ? `${Number(my.amount||0).toLocaleString()} DOPE` : '—'}</div>
            {my && (
              <div className="muted" style={{ fontSize: 12 }}>
                Pending: {Number(my.pending_fbx||0).toFixed(8)} FBX • Unlocks at {my.locked_until} ({lockLeft} blocks)
                <div style={{ marginTop: 6 }}>
                  <LockProgress current={height} end={my.locked_until || 0} />
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  Unlocks in {Math.max(0, minsLeft).toFixed(0)} minutes
                </div>
              </div>
            )}
          </div>
          <div className="badge badge-open"><span className="dot"/> Live</div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:700, marginBottom:8}}>Actions</div>
        <div className="row" style={{gap:10, alignItems:'center'}}>
          <input className="input" placeholder="Amount DOPE" value={amount} onChange={e=>setAmount(e.target.value)} style={{flex:1}} />
          <button className="cta" onClick={onStake} disabled={!amount || !address}>Stake</button>
          <button className="pill" onClick={onUnstake} disabled={!address}>Unstake</button>
          <button className="pill" onClick={onClaim} disabled={!address}>Claim FBX</button>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:700, marginBottom:8}}>Recent payouts</div>
        {(!pool.payouts || pool.payouts.length === 0) && (
          <div className="muted">No payouts yet</div>
        )}
        {pool.payouts && pool.payouts.length > 0 && (
          <div className="list">
            {pool.payouts.map((p, i) => (
              <div className="list-item" key={i}>
                <div>FBX: {Number(p.fbx_total||p.distributed||0).toFixed(8)}</div>
                <div className="muted" style={{fontSize:12}}>{p.time ? new Date(p.time).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {status && <div className="card" style={{color:'#cbbdff'}}>{status}</div>}
    </div>
  );
}
