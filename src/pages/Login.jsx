import React, { useEffect, useState } from 'react';
import SplashScreen from '../components/SplashScreen.jsx';
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!showSplash && !isUnlocked && biometricEnabled) {
      tryBiometric().catch(() => {});
    }
  }, [showSplash, isUnlocked, biometricEnabled, tryBiometric]);

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

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }
  return (
    <div className="login-wrap" style={{
      maxWidth: 380,
      margin: '0 auto',
      padding: 'min(3vw,18px) min(2vw,10px)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      background: '#101214',
    }}>
      <div className="card" style={{
        textAlign:'center',
        padding:'18px 8px 14px 8px',
        position:'relative',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: 10,
      }}>
        <div
          className="title-anim"
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 0.3,
            background: 'linear-gradient(90deg, gold, #bfff00 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'color-fade-lime 1.2s cubic-bezier(0.4,1.4,0.4,1) forwards',
            wordBreak: 'break-word',
            lineHeight: 1.2,
            display: 'inline-block',
            textShadow: '0 0 2px #bfff00, 0 0 8px #fff',
            filter: 'brightness(1.2) contrast(1.1)',
          }}
        >
          Welcome to Dopebrix wallet
        </div>
        <style>{`
          @keyframes color-fade-lime {
            0% { background: linear-gradient(90deg, gold, gold 80%); }
            60% { background: linear-gradient(90deg, gold, #bfff00 60%); }
            100% { background: linear-gradient(90deg, #bfff00, #bfff00 80%); }
          }
        `}</style>
      </div>

      <div className="card" style={{
        textAlign:'center',
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 6px 10px 6px',
        marginBottom: 8,
      }}>
        <div className="muted" style={{fontSize: 14}}>Enter Passcode</div>
        <div className="dots" style={{margin: '10px 0'}}>
          {[0,1,2,3,4,5].map(i => (
            <span key={i} className={`dot ${i < passcode.length ? 'filled' : ''}`}></span>
          ))}
        </div>
        <div className="keypad" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '7px',
          maxWidth: 240,
          margin: '0 auto',
        }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="key" style={{padding:'12px 0', fontSize:18}} onClick={()=>addDigit(String(n))}>{n}</button>
          ))}
          <button className="key" style={{padding:'12px 0', fontSize:18}} onClick={clear}>⌫</button>
          <button className="key" style={{padding:'12px 0', fontSize:18}} onClick={()=>addDigit('0')}>0</button>
          <button className="key" style={{padding:'12px 0', fontSize:18}} onClick={backspace}>←</button>
        </div>
        <div className="spacer" style={{height:8}}></div>
        <div className="row" style={{display:'flex', gap:8, justifyContent:'center'}}>
          <button className="cta" style={{flex:1, minWidth:0}} onClick={handleUnlock} disabled={passcode.length < 4}>Unlock</button>
          <button className="cta primary" style={{flex:1, minWidth:0}} onClick={handleCreate} disabled={creating || passcode.length < 4}>{creating ? 'Setting up…' : 'Create/Restore'}</button>
        </div>
        {err && <div style={{color:'salmon', marginTop:8, fontSize:13}}>{err}</div>}
      </div>

      <div style={{width:'100%'}}><BiometricToggle /></div>

      <div className="center muted" style={{marginTop:8, fontSize:13, width:'100%', textAlign:'center'}}>Network: {import.meta.env.VITE_NETWORK_NAME || 'fairbrix'}</div>
    </div>
  );
}
