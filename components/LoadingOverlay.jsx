// components/LoadingOverlay.jsx
import React from "react";

export default function LoadingOverlay({ text = "AI Analysis • 분석 중…" }) {
  return (
    <>
      <div className="overlay" role="status" aria-live="polite">{text}</div>
      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.75);
          display: grid;
          place-items: center;
          z-index: 50;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.2px;
        }
      `}</style>
    </>
  );
}
