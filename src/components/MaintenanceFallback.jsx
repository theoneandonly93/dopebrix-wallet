import React, { useEffect, useState } from "react";

export default function MaintenanceFallback() {
  const [status, setStatus] = useState({ ok: null, syncing: false, sync: 0 });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(import.meta.env.VITE_FAIRBRIX_RPC_URL + "/status");
        const data = await res.json();
        setStatus(data);
        if (data.ok && !data.syncing && data.sync >= 99.9) {
          window.location.reload();
        }
      } catch {
        setStatus({ ok: false });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getMessage = () => {
    if (status.ok === null) return "Connecting to the network...";
    if (!status.ok) return "Nodes are offline for maintenance.";
    if (status.syncing)
      return `Syncing Fairbrix blocks... ${status.sync}%`;
    return "Almost done — loading wallet data.";
  };

  const getEmoji = () => {
    if (!status.ok) return "🛠️";
    if (status.syncing) return "⚡";
    return "👻";
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "#00ff80",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, monospace",
        textAlign: "center",
      }}
    >
      <img
        src="/dopefx-ghost-coin.png"
        alt="Dope Ghost"
        className="ghost-float"
        style={{
          width: 140,
          marginBottom: 25,
          filter: "drop-shadow(0 0 8px #00ff80)",
        }}
      />
      <h1
        style={{
          fontSize: 28,
          marginBottom: 10,
          background: "linear-gradient(90deg,#00ff80,#00ffaa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {getEmoji()} DopeBrix Network Update
      </h1>
      <p style={{ color: "#888", fontSize: 16, maxWidth: 360, lineHeight: 1.4 }}>
        {getMessage()}
      </p>

      {status.syncing && (
        <div
          style={{
            width: 200,
            height: 6,
            background: "#111",
            marginTop: 25,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${status.sync}%`,
              height: "100%",
              background: "#00ff80",
              transition: "width 1s ease",
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 40, opacity: 0.7, fontSize: 13 }}>
        <span style={{ color: "#00ff80" }}>Powered by Dope ⚡ Fairbrix</span>
      </div>
    </div>
  );
}
