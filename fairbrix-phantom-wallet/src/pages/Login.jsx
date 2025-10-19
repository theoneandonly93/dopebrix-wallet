import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../services/auth.js';

function BiometricToggle() {
  const { biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setSupported);
    }
  }, []);

  if (!supported) return null;

  return (
    <div className="card">
      <div className="row" style={{alignItems:'center'}}>
        <div>
          <div style={{fontWeight:700}}>Biometric unlock</div>
          <div className="muted">Use FaceID/TouchID/Windows Hello</div>
        </div>
        <div style={{textAlign:'right'}}>
          {biometricEnabled ? (
            <button className="cta" onClick={disableBiometric}>Disable</button>
          ) : (
            <button className="cta" onClick={enableBiometric}>Enable</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { isUnlocked, unlockWithPasscode, createOrLoadWallet, biometricEnabled, tryBiometric } = useAuthStore();
  const [passcode, setPasscode] = useState('');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isUnlocked && biometricEnabled) {
      tryBiometric().catch(() => {});
    }
  }, [isUnlocked, biometricEnabled, tryBiometric]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      await createOrLoadWallet(passcode);
    } catch (e) {
      setErr(e?.message || 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockWithPasscode(passcode);
    } catch (e) {
      setErr('Invalid passcode');
    }
  };

  // Numeric keypad helpers
  const addDigit = (d) => {
    if (passcode.length >= 6) return;
    setPasscode((p) => p + d);
  };
  const backspace = () => setPasscode((p) => p.slice(0, -1));
  const clear = () => setPasscode('');

  return (
    <div className="login-wrap" style={{maxWidth: 420, margin: '36px auto', padding: '0 16px'}}>
      <div className="card" style={{textAlign:'center', padding:'24px'}}>
        <img className="logo-anim" src="/dopebrix.png" alt="DopeBrix" style={{width:72, height:72, borderRadius:16, marginBottom: 10}} />
        <div className="title-anim" style={{fontSize: 22, fontWeight: 800, letterSpacing:0.3}}>DopeBrix Wallet</div>
      </div>

      <div className="card" style={{textAlign:'center'}}>
        <div className="muted">Enter Passcode</div>
        <div className="dots">
          {[0,1,2,3,4,5].map(i => (
            <span key={i} className={`dot ${i < passcode.length ? 'filled' : ''}`}></span>
          ))}
        </div>
        <div className="keypad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="key" onClick={()=>addDigit(String(n))}>{n}</button>
          ))}
          <button className="key" onClick={clear}>⌫</button>
          <button className="key" onClick={()=>addDigit('0')}>0</button>
          <button className="key" onClick={backspace}>←</button>
        </div>
        <div className="spacer"></div>
        <div className="row">
          <button className="cta" onClick={handleUnlock} disabled={passcode.length < 4}>Unlock</button>
          <button className="cta primary" onClick={handleCreate} disabled={creating || passcode.length < 4}>{creating ? 'Setting up…' : 'Create/Restore'}</button>
        </div>
        {err && <div style={{color:'salmon', marginTop:10}}>{err}</div>}
      </div>

      <BiometricToggle />

      <div className="center muted" style={{marginTop:14}}>Network: {import.meta.env.VITE_NETWORK_NAME || 'fairbrix'}</div>
    </div>
  );
}
