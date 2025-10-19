import React, { useEffect, useMemo, useState } from 'react';
import { fairbrix } from '../services/fairbrix.js';

export default function Create() {
  const [tab, setTab] = useState('token');
  const [status, setStatus] = useState('');

  // Popular runes
  const [popular, setPopular] = useState([]);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query) return popular || [];
    const q = query.toLowerCase();
    return (popular || []).filter(x => ((x.name||x.ticker||'').toLowerCase().includes(q)));
  }, [popular, query]);

  // Etch form state (rune)
  const [runeName, setRuneName] = useState('UNCOMMON•GOODS');
  const [runeSymbol, setRuneSymbol] = useState('');
  const [divisibility, setDivisibility] = useState(0);
  const [enableMint, setEnableMint] = useState(false);
  const [mintAmount, setMintAmount] = useState(0);
  const [mintCap, setMintCap] = useState('');
  const [premine, setPremine] = useState(0);
  const [winMode, setWinMode] = useState('none'); // none | height | offset
  const [startHeight, setStartHeight] = useState('');
  const [endHeight, setEndHeight] = useState('');
  const [startOffset, setStartOffset] = useState('');
  const [endOffset, setEndOffset] = useState('');
  const [feeSel, setFeeSel] = useState('medium');
  const [feeCustom, setFeeCustom] = useState('');
  // Transfer form state (simple)
  const [xferSymbol, setXferSymbol] = useState('');
  const [xferTo, setXferTo] = useState('');
  const [xferAmount, setXferAmount] = useState('');

  // NFT form state
  const [nftName, setNftName] = useState('My Fairbrix NFT');
  const [nftDesc, setNftDesc] = useState('Description');
  const [nftContent, setNftContent] = useState('ipfs://…');

  useEffect(() => {
    (async () => {
      try { setPopular(await fairbrix.getPopularRunes()); } catch {}
    })();
  }, []);

  const handleEtch = async () => {
    // Map to current backend: ticker/runeName, supply, decimals
    const decimals = Number(divisibility) || 0;
    let supply = Number(premine) || 0;
    if (enableMint) {
      const a = Number(mintAmount) || 0;
      const c = Number(mintCap) || 0;
      if (a > 0 && c > 0) supply += a * c; // rough total cap
    }
    setStatus('Submitting rune etch…');
    try {
      const res = await fairbrix.createRuneToken({ ticker: runeName, supply, decimals });
      setStatus(res?.message || 'Etch submitted');
    } catch (e) {
      setStatus(e?.message || 'Etch failed');
    }
  };

  const handleTransfer = async () => {
    setStatus('Submitting rune transfer…');
    try {
      const amount = Number(xferAmount) || 0;
      if (!xferSymbol || !xferTo || amount <= 0) throw new Error('Enter symbol, recipient and amount');
      const res = await fairbrix.transferRune({ ticker: xferSymbol, amount, toAddress: xferTo });
      setStatus(res?.txid ? `Transfer broadcast: ${res.txid}` : 'Transfer submitted');
      setXferAmount('');
      setXferTo('');
    } catch (e) {
      setStatus(e?.message || 'Transfer failed');
    }
  };

  const handleCreateNFT = async () => {
    setStatus('Creating NFT (Ordinal)…');
    try {
      const res = await fairbrix.createOrdinalNFT({ name: nftName, description: nftDesc, content: nftContent });
      setStatus(res?.message || 'NFT creation submitted');
    } catch (e) {
      setStatus(e?.message || 'NFT creation failed');
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="tabbar">
          <button className={tab==='token'?'active':''} onClick={() => setTab('token')}>Dopebrix Runes</button>
          <button className={tab==='nft'?'active':''} onClick={() => setTab('nft')}>Ordinals</button>
        </div>

        {tab === 'token' && (
          <div style={{marginTop:12}}>
            {/* Popular Runes */}
            <div className="h-section">Popular Runes</div>
            <div className="spacer"/>
            <div className="searchbar">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm11 20-6-6"/></svg>
              <input placeholder="Search Rune" value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
            <div className="spacer"/>
            <div className="cards-x">
              {(filtered || []).map((it, i) => (
                <div className="rune-card" key={i}>
                  <div className="rune-title">{(it.name || it.ticker || 'RUNE').toUpperCase()}</div>
                  <div className="rune-bar"/>
                  <div className="spacer"/>
                  <div className="muted">Rune number</div>
                  <div style={{fontWeight:700}}>{it.number || i+1}</div>
                  <div className="spacer"/>
                  <div className="muted">Limit per mint</div>
                  <div style={{fontWeight:700}}>{it.limitPerMint || it.max || 2500}</div>
                  <div className="spacer"/>
                  <button className="cta" onClick={()=>fairbrix.mintRune({ ticker: it.ticker || it.name || 'RUNE', amount:1 })} style={{width:'100%', background:'#eee', color:'#111'}}>Mint →</button>
                </div>
              ))}
            </div>

            <div className="divider"/>

            {/* Etch your own */}
            <div className="h-title">Etch your rune</div>
            <div className="spacer"/>
            <div style={{fontWeight:700, marginBottom:6}}>Your rune</div>
            <label className="label">Rune name</label>
            <input className="input" value={runeName} onChange={(e)=>setRuneName(e.target.value)} />
            <div className="help">Names consist of letters A–Z and are between 13 & 28 characters long. They may contain spacers, represented as bullets •, to aid readability</div>
            <div className="spacer"/>
            <label className="label">Rune symbol (optional)</label>
            <input className="input" value={runeSymbol} onChange={(e)=>setRuneSymbol(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Divisibility (optional)</label>
            <input className="input" type="number" value={divisibility} onChange={(e)=>setDivisibility(e.target.value)} />

            <div className="divider"/>
            <div style={{fontWeight:800, fontSize:20}}>Mint options</div>
            <div className="spacer"/>
            <div className="row" style={{alignItems:'center'}}>
              <div className="muted" style={{flex:1}}>Enable mint</div>
              <input type="checkbox" checked={enableMint} onChange={(e)=>setEnableMint(e.target.checked)} />
            </div>
            {enableMint && (
              <>
                <div className="spacer"/>
                <label className="label">Mint amount</label>
                <input className="input" type="number" value={mintAmount} onChange={(e)=>setMintAmount(e.target.value)} />
                <div className="help">The fixed amount of new units created per mint transaction.</div>
                <div className="spacer"/>
                <label className="label">Mint cap</label>
                <input className="input" type="number" value={mintCap} onChange={(e)=>setMintCap(e.target.value)} />
                <div className="help">Max number of times the rune can be minted.</div>
              </>
            )}

            <div className="divider"/>
            <div style={{fontWeight:800, fontSize:20}}>Advanced</div>
            <div className="spacer"/>
            <label className="label">Premine (optional)</label>
            <input className="input" type="number" value={premine} onChange={(e)=>setPremine(e.target.value)} />
            <div className="help">Amount allocated to your address when etching.</div>

            <div className="divider"/>
            <div style={{fontWeight:800, fontSize:20}}>Minting window (advanced)</div>
            <div className="radio-row">
              <label className="radio-item"><input type="radio" name="win" checked={winMode==='none'} onChange={()=>setWinMode('none')} /> None</label>
              <label className="radio-item"><input type="radio" name="win" checked={winMode==='height'} onChange={()=>setWinMode('height')} /> Start Height + End Height</label>
              <label className="radio-item"><input type="radio" name="win" checked={winMode==='offset'} onChange={()=>setWinMode('offset')} /> Start Offset + End Offset</label>
            </div>
            {winMode==='height' && (
              <>
                <div className="spacer"/>
                <div className="row">
                  <div>
                    <label className="label">Start height</label>
                    <input className="input" type="number" value={startHeight} onChange={(e)=>setStartHeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">End height</label>
                    <input className="input" type="number" value={endHeight} onChange={(e)=>setEndHeight(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            {winMode==='offset' && (
              <>
                <div className="spacer"/>
                <div className="row">
                  <div>
                    <label className="label">Start offset</label>
                    <input className="input" type="number" value={startOffset} onChange={(e)=>setStartOffset(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">End offset</label>
                    <input className="input" type="number" value={endOffset} onChange={(e)=>setEndOffset(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="divider"/>
            <div className="h-section">Etching Fees</div>
            <div className="help">Set your desired fee rate for the Rune etch transactions.</div>
            <div className="spacer"/>
            <div className="fee-cards">
              <div className={`fee-card ${feeSel==='medium'?'active':''}`} onClick={()=>setFeeSel('medium')}>
                <div style={{fontWeight:700}}>Medium priority</div>
                <div className="muted">1 Sats /vByte</div>
              </div>
              <div className={`fee-card ${feeSel==='high'?'active':''}`} onClick={()=>setFeeSel('high')}>
                <div style={{fontWeight:700}}>High priority</div>
                <div className="muted">4 Sats /vByte</div>
              </div>
              <div className={`fee-card ${feeSel==='custom'?'active':''}`} onClick={()=>setFeeSel('custom')}>
                <div style={{fontWeight:700}}>Custom</div>
                <div className="muted">Manual settings</div>
                {feeSel==='custom' && (
                  <input className="input" style={{marginTop:8}} placeholder="Sats / vByte" value={feeCustom} onChange={(e)=>setFeeCustom(e.target.value)} />
                )}
              </div>
            </div>

            <div className="spacer"/>
            <button className="cta" onClick={handleEtch} style={{width:'100%', background:'#ddd', color:'#111'}}>Submit & Etch</button>
            <div className="spacer"/>
            <div className="help">You will be prompted to pay the Etch cost with your connected wallet.</div>
            <div className="spacer"/>
            <div className="alert"><div style={{fontWeight:800}}>Important</div>
              <div>We recommend setting a high enough fee rate for your order to be processed fast, especially if trying to etch a popular Rune name, to prevent front‑running.</div>
            </div>

            <div className="divider"/>
            {/* Simple Transfer */}
            <div className="h-section">Transfer a Rune</div>
            <div className="spacer"/>
            <label className="label">Rune symbol</label>
            <input className="input" placeholder="EX: DOPE" value={xferSymbol} onChange={(e)=>setXferSymbol(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Recipient address</label>
            <input className="input" placeholder="fbrx1…" value={xferTo} onChange={(e)=>setXferTo(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Amount</label>
            <input className="input" type="number" placeholder="0" value={xferAmount} onChange={(e)=>setXferAmount(e.target.value)} />
            <div className="spacer"/>
            <button className="cta" onClick={handleTransfer} style={{width:'100%'}}>Transfer</button>
          </div>
        )}

        {tab === 'nft' && (
          <div style={{marginTop:12}}>
            <label className="label">Name</label>
            <input className="input" value={nftName} onChange={(e)=>setNftName(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Description</label>
            <input className="input" value={nftDesc} onChange={(e)=>setNftDesc(e.target.value)} />
            <div className="spacer"/>
            <label className="label">Content URI</label>
            <input className="input" value={nftContent} onChange={(e)=>setNftContent(e.target.value)} />
            <div className="spacer"/>
            <button className="cta primary" onClick={handleCreateNFT}>Create NFT</button>
          </div>
        )}
      </div>
      {status && <div className="card" style={{color:'#cbbdff'}}>{status}</div>}
    </div>
  );
}

