// components/SiteHeader.jsx
import React from "react";

export default function SiteHeader() {
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">H</div>
            <div>
              <div className="logo-text">Hansoll Market Intelligence</div>
              <div className="logo-subtitle">Executive Dashboard</div>
            </div>
          </div>
          <div className="live-status">
            <span className="pulse" />
            <span className="live-label">Live Data</span>
          </div>
        </div>
      </header>

      <style jsx>{`
        .header { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .header-inner { max-width: 1200px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-mark { width: 28px; height: 28px; border-radius: 8px; background: #111827; color: #fff; display: grid; place-items: center; font-weight: 800; }
        .logo-text { font-weight: 800; letter-spacing: -0.2px; }
        .logo-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
        .live-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #0f172a; }
        .pulse { width: 8px; height: 8px; border-radius: 999px; background: #10b981; box-shadow: 0 0 0 0 rgba(16,185,129,0.7); animation: pulse 1.6s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7);} 70% { box-shadow: 0 0 0 8px rgba(16,185,129,0);} 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0);} }
      `}</style>
    </>
  );
}
