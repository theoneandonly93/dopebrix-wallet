import React, { useState } from 'react';
import { createUnifiedWallet, saveUnifiedWallet } from '../../lib/wallet/unifiedWallet.js';
import { useAuthStore } from '../../services/auth.js';
import * as bip39 from '@scure/bip39';
import { wordlist as EN_WORDS } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import baseX from 'base-x';

const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
function encode58Check(u8){ const chk = sha256(sha256(u8)); const full = new Uint8Array(u8.length+4); full.set(u8,0); full.set(chk.slice(0,4), u8.length); return b58.encode(full); }
export default function SeedScreen({ onFinish }) {
  const { setSeedBacked, getSeed } = useAuthStore();
  const [wallet, setWallet] = useState(null);
  const [mode, setMode] = useState('generate');
  const [mnemonicIn, setMnemonicIn] = useState('');
  const [busy, setBusy] = useState(false);

  const toP2PKH = (priv, version) => {
    const pub = secp.getPublicKey(priv, true);
    const h160 = ripemd160(sha256(pub));
    const payload = new Uint8Array(1 + h160.length);
    payload[0] = version; payload.set(h160, 1);
    return encode58Check(payload);
  };
  const toWIF = (priv, prefix) => {
    const payload = new Uint8Array(1 + 32 + 1);
    payload[0] = prefix; payload.set(priv, 1); payload[33] = 0x01;
    return encode58Check(payload);
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      // Always generate a new mnemonic, never reuse localStorage
      const mnemonic = bip39.generateMnemonic(EN_WORDS, 128);
      // Save new mnemonic to localStorage immediately
      try { localStorage.setItem('fbrx_seed_phrase', mnemonic); } catch {}
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = HDKey.fromMasterSeed(seed);
      const fbxNode = root.derive("m/44'/236'/0'/0/0");
      const dopeNode = root.derive("m/44'/237'/0'/0/0");
      const fbxAddr = toP2PKH(fbxNode.privateKey, 0x23);
      const dopeAddr = toP2PKH(dopeNode.privateKey, 0x35);
      const fbxWif = toWIF(fbxNode.privateKey, 0x80);
      const dopeWif = toWIF(dopeNode.privateKey, 0x80);
      setWallet({ mnemonic, fbx: { address: fbxAddr, wif: fbxWif }, dope: { address: dopeAddr, wif: dopeWif } });
    } catch (e) {
      // Fallback: always generate a new wallet
      const w = await createUnifiedWallet();
      setWallet(w);
      try { localStorage.setItem('fbrx_seed_phrase', w.mnemonic); } catch {}
    } finally { setBusy(false); }
  };

  const handleImport = async () => {
    const phrase = String(mnemonicIn || '').trim();
    if (!phrase) return;
    setBusy(true);
    try {
      if (bip39.validateMnemonic(phrase, EN_WORDS)) {
        const seed = bip39.mnemonicToSeedSync(phrase);
        const root = HDKey.fromMasterSeed(seed);
        const fbxNode = root.derive("m/44'/236'/0'/0/0");
        const dopeNode = root.derive("m/44'/237'/0'/0/0");
        const fbxAddr = toP2PKH(fbxNode.privateKey, 0x23);
        const dopeAddr = toP2PKH(dopeNode.privateKey, 0x35);
        const fbxWif = toWIF(fbxNode.privateKey, 0x80);
        const dopeWif = toWIF(dopeNode.privateKey, 0x80);
        setWallet({ mnemonic: phrase, fbx: { address: fbxAddr, wif: fbxWif }, dope: { address: dopeAddr, wif: dopeWif } });
      } else {
        const w = await createUnifiedWallet(phrase);
        setWallet(w);
      }
    } finally { setBusy(false); }
  };

  const handleContinue = async () => {
    if (!wallet) return;
    await saveUnifiedWallet(wallet);
    setSeedBacked(true);
    onFinish && onFinish();
  };

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Your Recovery Phrase</div>
      <div className="tabbar" style={{ justifyContent: 'center', margin: '0 auto 12px', width: 'fit-content' }}>
        <button className={mode==='generate' ? 'active' : ''} onClick={()=>setMode('generate')}>Generate</button>
        <button className={mode==='import' ? 'active' : ''} onClick={()=>setMode('import')}>Import</button>
      </div>
      {mode === 'generate' && !wallet && (
        <>
          <button className="cta primary" onClick={handleGenerate} disabled={busy}>{busy ? 'Generating...' : 'Generate New Wallet'}</button>
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            This seed unlocks: Fairbrix (FBX) — Layer 1 • Dopelganga (DOPE) — Layer 2
          </div>
        </>
      )}
      {mode === 'import' && !wallet && (
        <div>
          <textarea className="input" style={{ minHeight: 80 }} placeholder="Enter your 12-word phrase..." value={mnemonicIn} onChange={e=>setMnemonicIn(e.target.value)} />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Keep your seed phrase private. These words restore your wallet and give access to all your FBX and DOPE. Never share them.
          </div>
          <div className="spacer"/>
          <button className="cta" onClick={handleImport} disabled={busy || !mnemonicIn || !bip39.validateMnemonic(mnemonicIn.trim(), EN_WORDS)}>{busy ? 'Checking...' : 'Import Wallet'}</button>
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            This seed unlocks: Fairbrix (FBX) — Layer 1 • Dopelganga (DOPE) — Layer 2
          </div>
        </div>
      )}
      {wallet && (
        <>
          <div className="muted" style={{ margin: '8px 0' }}>Write down these 12 words — keep them offline.</div>
          <div className="mono" style={{ background:'#0f1215', border:'1px solid #23272d', borderRadius:12, padding:12, textAlign:'left' }}>{wallet.mnemonic}</div>
          <div className="spacer"/>
          <button className="cta primary" onClick={handleContinue}>Continue</button>
        </>
      )}
      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        These 12 words are your key to both FBX and DOPE. Lose them and no one can recover your funds.
      </div>
    </div>
  );
}


