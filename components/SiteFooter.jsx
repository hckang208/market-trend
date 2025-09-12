// components/SiteFooter.jsx
import React from "react";

export default function SiteFooter() {
  return (
    <>
      <footer className="footer">
        <p className="footer-text">© Hansoll Textile — Market Intelligence Dashboard</p>
      </footer>
      <style jsx>{`
        .footer { border-top: 1px solid #e5e7eb; margin-top: 24px; }
        .footer-text { max-width: 1200px; margin: 0 auto; padding: 14px 16px; color: #6b7280; font-size: 12px; }
      `}</style>
    </>
  );
}
