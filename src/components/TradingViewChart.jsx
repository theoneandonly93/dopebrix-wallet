import React, { useEffect, useRef } from 'react';

function genId() {
  return 'tv_chart_' + Math.random().toString(36).slice(2, 10);
}

export default function TradingViewChart({ symbol }) {
  const containerRef = useRef(null);
  const idRef = useRef(genId());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol || 'COINBASE:BTCUSD',
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#181c24',
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_legend: true,
          container_id: idRef.current,
        });
      }
    };
    container.appendChild(script);
    // Cleanup: remove script and clear container
    return () => {
      container.innerHTML = '';
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [symbol]);

  return (
    <div id={idRef.current} ref={containerRef} style={{width:'100%',height:180,borderRadius:12,overflow:'hidden',background:'#181c24'}}></div>
  );
}
