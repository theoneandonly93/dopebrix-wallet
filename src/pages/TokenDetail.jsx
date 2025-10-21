import React from 'react';
import TradingViewChart from '../components/TradingViewChart.jsx';

export default function TokenDetail({ symbol = 'FBX' }) {
  // Placeholder for props/state: token info, price, chart data, user position, etc.
  // TODO: fetch token info and price by symbol
  // Safe exit: cleanup and prevent double navigation
  const goBack = () => {
    // If you have any local state, reset it here (example: setState(null))
    // Prevent double navigation by disabling button after click
    if (window.__setAppTab) window.__setAppTab('wallet');
  };
  return (
    <div className="token-detail-page" style={{maxWidth:480,margin:'0 auto',padding:'16px 0'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <button className="icon-btn" onClick={goBack} style={{fontSize:22,fontWeight:700}}>&larr;</button>
        <div style={{fontWeight:900,fontSize:24}}>{symbol} Details</div>
      </div>
      {/* Live price and chart section */}
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{fontSize:32,fontWeight:900,color:'#bfff00',marginBottom:8}}>{symbol} — USD</div>
        <TradingViewChart symbol={symbol === 'FBX' ? 'COINBASE:BTCUSD' : symbol} />
      </div>
      {/* Action buttons */}
      <div style={{display:'flex',justifyContent:'space-around',marginBottom:18}}>
        <button className="cta" style={{fontWeight:700}}>Receive</button>
        <button className="cta" style={{fontWeight:700}}>Send</button>
        <button className="cta" style={{fontWeight:700}}>Cash</button>
        <button className="cta" style={{fontWeight:700}}>More</button>
      </div>
      {/* User position */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>Your Position</div>
        <div style={{fontSize:16,marginTop:4}}>Balance: --.--</div>
        <div style={{fontSize:14,color:'#bfff00',marginTop:2}}>24hr Return: --.--%</div>
      </div>
      {/* Token info */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>Token Info</div>
        <div>Name: --</div>
        <div>Symbol: --</div>
        <div>Network: --</div>
        <div>Mint Address: --</div>
        <div>Market Cap: --</div>
        <div>Total Supply: --</div>
        <div>Circulating Supply: --</div>
        <div>Holders: --</div>
        <div>Time Created: --</div>
      </div>
      {/* About & Socials */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>About</div>
        <div>--</div>
        <div style={{marginTop:8,fontWeight:700}}>Socials</div>
        <div>--</div>
      </div>
      {/* 24hr Performance */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>24hr Performance</div>
        <div>Volume: --</div>
        <div>Traders: --</div>
      </div>
      {/* Security section */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>Security</div>
        <div>Top 10 Holder %: --</div>
        <div>Mintable: --</div>
        <div>Mutable: --</div>
      </div>
      {/* Token activity */}
      <div style={{background:'#181c24',borderRadius:8,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:18}}>Your Activity</div>
        <div>--</div>
      </div>
      {/* Buy/Sell buttons */}
      <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
        <button className="cta primary" style={{flex:1,marginRight:8,fontWeight:700}}>Buy</button>
        <button className="cta primary" style={{flex:1,marginLeft:8,fontWeight:700}}>Sell</button>
      </div>
    </div>
  );
}
