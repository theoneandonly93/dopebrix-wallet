import React from 'react';

export default function WelcomeScreen({ onNext }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Welcome to Dopebrix Wallet</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Your bridge between <b>Fairbrix (FBX)</b> and <b>Dopelganga (DOPE)</b>.
      </div>
      <div className="list" style={{ marginBottom: 16 }}>
        <div className="muted" style={{ fontSize: 14 }}>• FBX secures the base network</div>
        <div className="muted" style={{ fontSize: 14 }}>• DOPE powers apps and rewards</div>
        <div className="muted" style={{ fontSize: 14 }}>• One key controls both</div>
      </div>
      <button className="cta primary" onClick={onNext}>Get Started</button>
      <div className="muted" style={{ marginTop: 10, fontStyle: 'italic' }}>
        One wallet. Two worlds. Fairbrix keeps it real — Dope makes it move.
      </div>
    </div>
  );
}

