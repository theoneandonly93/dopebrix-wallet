import React, { useEffect, useState } from 'react';
import { useAccounts } from '../services/accounts.js';

export default function Accounts() {
  const { accounts, activeIndex, init, setActive, addAccount, renameAccount } = useAccounts();
  const [menuIndex, setMenuIndex] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { init(); }, [init]);

  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };
  const openMenu = (i) => { setMenuIndex(i); setRenameValue(accounts[i]?.label || ''); };
  const closeMenu = () => setMenuIndex(null);
  const saveRename = () => { if (menuIndex!=null && renameValue.trim()) renameAccount(menuIndex, renameValue.trim()); closeMenu(); };

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', gap:10}}>
        <button className="icon-btn" onClick={back} title="Back">←</button>
        <div style={{fontWeight:900, fontSize:28}}>Accounts</div>
      </div>

      <div className="card">
        <div className="list">
          {accounts.map((acc, i) => (
            <div className="list-item" key={`acc-${i}`} onClick={()=>setActive(i)}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:32,height:32,borderRadius:12,background:i===activeIndex?'#2a2f35':'#15181b',border:'1px solid #23272d'}}/>
                <div>
                  <div style={{fontWeight:700}}>{acc.label}</div>
                  <div className="muted" style={{fontSize:12}}>{acc.address ? acc.address : '$0.00 USD'}</div>
                </div>
              </div>
              <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); openMenu(i);}} title="More">⋯</button>
            </div>
          ))}
        </div>
      </div>

      <div className="earn-bottom">
        <button className="cta" style={{width:'100%'}} onClick={addAccount}>+ Generate account</button>
      </div>

      {menuIndex!=null && (
        <div className="sheet">
          <div className="sheet-inner">
            <div style={{fontWeight:800, marginBottom:8}}>{accounts[menuIndex]?.label}</div>
            <div className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
              <div className="muted">Rename account</div>
            </div>
            <div className="spacer"/>
            <input className="input" value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} />
            <div className="spacer"/>
            <div className="row">
              <button className="cta" onClick={closeMenu}>Cancel</button>
              <button className="cta primary" onClick={saveRename}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

