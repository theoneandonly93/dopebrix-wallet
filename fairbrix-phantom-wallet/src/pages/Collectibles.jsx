import React, { useState } from 'react';

export default function Collectibles() {
  const [sheet, setSheet] = useState(false);

  return (
    <div className="grid">
      <div className="card">
        <div className="muted">Est. collectibles value USD</div>
        <div className="balance">$0.00</div>

        <div className="spacer"/>
        <button className="cta primary" style={{width:'100%', borderRadius:18}} onClick={()=>setSheet(true)}>
          <span style={{transform:'rotate(90deg)'}}>↧</span>
          Receive
        </button>

        <div className="divider"/>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div className="muted">0 item</div>
          <div className="muted">🗑️</div>
        </div>

        <div className="spacer"/>
        <div className="center muted" style={{padding:'40px 0'}}>There's nothing here yet</div>
      </div>

      {sheet && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="center" style={{marginBottom:6}}><div style={{width:40,height:4,borderRadius:4,background:'#444',margin:'0 auto'}}/></div>
            <div style={{fontWeight:900, fontSize:18}}>Select collectible type</div>
            <div className="spacer"/>
            <div className="alert" style={{background:'#2b2213', color:'#ffd7a6'}}>⚠ Wallet not backed up</div>
            <div className="spacer"/>
            <div className="list">
              <div className="list-item" style={{borderRadius:16}} onClick={()=>setSheet(false)}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div className="token-circle"/>
                  <div>
                    <div style={{fontWeight:700}}>Ordinals</div>
                    <div className="muted" style={{fontSize:12}}>Inscriptions on the Bitcoin network.</div>
                  </div>
                </div>
                <div className="muted">›</div>
              </div>
              <div className="list-item" style={{borderRadius:16}} onClick={()=>setSheet(false)}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div className="token-circle" style={{background:'#ff6a00'}}/>
                  <div>
                    <div style={{fontWeight:700}}>Stacks NFTs</div>
                    <div className="muted" style={{fontSize:12}}>NFTs on the Stacks network.</div>
                  </div>
                </div>
                <div className="muted">›</div>
              </div>
            </div>
            <div className="spacer"/>
            <button className="cta" onClick={()=>setSheet(false)} style={{width:'100%'}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
