import React, { useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1400); // 1.4s splash duration
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
  height: '100vh', background: '#101214', zIndex: 9999, position: 'fixed', width: '100vw', left: 0, top: 0,
      paddingTop: '13vh',
    }}>
      <img
        src="/dopebrix.png"
        alt="DopeBrix"
        style={{
          width: 96, height: 96, borderRadius: 20,
          animation: 'splash-zoom-fade 1.2s cubic-bezier(0.4,1.4,0.4,1) forwards',
        }}
      />
      <style>{`
        @keyframes splash-zoom-fade {
          0% { transform: scale(0.7); opacity: 0.2; }
          60% { transform: scale(1.15); opacity: 1; }
          80% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
