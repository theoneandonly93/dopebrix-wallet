import React from 'react';

// Shows progress toward unlock based on remaining blocks.
// Assumes default 720-block lock window unless overridden.
export default function LockProgress({ current = 0, end = 0, window = 720 }) {
  const cur = Number(current) || 0;
  const en = Number(end) || 0;
  const win = Number(window) || 0;

  const remaining = Math.max(0, en - cur);
  const clamped = win ? Math.min(win, remaining) : 0;
  const percent = win ? Math.min(100, Math.max(0, ((win - clamped) / win) * 100)) : 0;

  return (
    <div style={{ width: '100%', background: '#1c1f23', borderRadius: 999, height: 6, overflow: 'hidden' }}>
      <div
        style={{
          width: `${percent}%`,
          height: 6,
          background: 'linear-gradient(90deg, #22c55e, #10b981)',
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

