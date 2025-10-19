import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler);

export default function Sparkline({ payouts }) {
  const hasData = Array.isArray(payouts) && payouts.length > 0;
  if (!hasData) return <div className="muted" style={{ fontSize: 12 }}>No payouts yet</div>;

  const labels = payouts.map((p) => (p.time ? new Date(p.time).toLocaleTimeString() : ''));
  const values = payouts.map((p) => Number(p.fbx_total ?? p.distributed ?? 0));

  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: '#00FF88',
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c } = chart;
          const gradient = c.createLinearGradient(0, 0, 0, 60);
          gradient.addColorStop(0, 'rgba(0,255,136,0.25)');
          gradient.addColorStop(1, 'rgba(0,255,136,0.0)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  return (
    <div style={{ height: 64, width: '100%' }}>
      <Line data={data} options={options} />
    </div>
  );
}

