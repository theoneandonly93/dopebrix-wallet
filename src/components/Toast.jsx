import React, { useEffect } from "react";

export default function Toast({ message, show, onClose, duration = 3000 }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: 32,
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(90deg,#b8f0ff 0%,#e0eafc 100%)",
      color: "#222",
      padding: "14px 32px",
      borderRadius: 12,
      fontWeight: 800,
      fontSize: 18,
      boxShadow: "0 2px 16px #0004",
      zIndex: 9999,
      animation: "fade-in 0.3s"
    }}>
      <span role="img" aria-label="usdc">💵</span> {message}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
