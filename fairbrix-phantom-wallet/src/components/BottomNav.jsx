import React from 'react';

const Icon = ({ name }) => {
  switch (name) {
    case 'wallet':
      return (<svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 3h3v6h-3a3 3 0 0 1-3-3 3 3 0 0 1 3-3z"/></svg>);
    case 'collect':
      return (<svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.88L18.18 22 12 18.6 5.82 22 7 14.15 2 9.27l6.91-1.01L12 2z"/></svg>);
    case 'earn':
      return (<svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17h2v-5h2v5h2V7h2v10h2v-3h2v3h2v-8h2v10H3z"/></svg>);
    case 'activity':
      return (<svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 2v4h-2V2H8v2H6V2H4v2H2v2h2v2H2v2h2v2H2v2h2v2H2v2h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v-2h-2v-2h2v-2h-2v-2h2V8h-2V6h2V4h-2V2h-2v2h-2V2h-2z"/></svg>);
    case 'explore':
      return (<svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm3.5 6.5-3.2 7.2-7.3 3.3 3.2-7.2 7.3-3.3z"/></svg>);
    default:
      return null;
  }
};

export default function BottomNav({ value, onChange }) {
  return (
    <nav className="bottom-nav">
      <div className={`bottom-item ${value === 'wallet' ? 'active' : ''}`} onClick={() => onChange('wallet')}>
        <Icon name="wallet" />
        Wallet
      </div>
      <div className={`bottom-item ${value === 'collectibles' ? 'active' : ''}`} onClick={() => onChange('collectibles')}>
        <Icon name="collect" />
        Collectibles
      </div>
      <div className={`bottom-item ${value === 'earn' ? 'active' : ''}`} onClick={() => onChange('earn')}>
        <Icon name="earn" />
        Earn
      </div>
      <div className={`bottom-item ${value === 'activity' ? 'active' : ''}`} onClick={() => onChange('activity')}>
        <Icon name="activity" />
        Activity
      </div>
      <div className={`bottom-item ${value === 'explore' ? 'active' : ''}`} onClick={() => onChange('explore')}>
        <Icon name="explore" />
        Explore
      </div>
    </nav>
  );
}
