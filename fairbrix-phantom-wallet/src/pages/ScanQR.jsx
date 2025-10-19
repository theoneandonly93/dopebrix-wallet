import React, { useEffect, useRef, useState } from 'react';

export default function ScanQR() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError('Camera unavailable');
      }
    })();
    return () => {
      try { streamRef.current && streamRef.current.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, []);

  const back = () => { if (window.__setAppTab) window.__setAppTab('wallet'); };

  return (
    <div className="grid">
      <div className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
        <button className="icon-btn" onClick={back}>←</button>
        <div style={{fontWeight:900, fontSize:22}}>Scan QR</div>
        <span/>
      </div>

      <div className="card" style={{background:'#0f1113'}}>
        <div className="qr-wrap">
          <video ref={videoRef} className="qr-video" playsInline muted></video>
          <div className="qr-frame">
            <span className="qr-corner tl"/>
            <span className="qr-corner tr"/>
            <span className="qr-corner bl"/>
            <span className="qr-corner br"/>
          </div>
        </div>
        {error && <div className="muted" style={{marginTop:8}}>{error}</div>}
      </div>

      <div className="center">
        <div className="earn-title">Scan QR Code</div>
        <div className="muted">Send assets or connect to any Bitcoin/Stacks DApp</div>
      </div>
    </div>
  );
}

