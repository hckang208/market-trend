// components/AnalysisView.jsx
import React from "react";
import Head from "next/head";

export default function AnalysisView({
  pageTitle = "AI Analysis — Hansol MI",
  title = "AI 분석",
  subtitle = "",
  bullets = [],
  summary = "",
  meta = {},           // { model, lastUpdated, articlesUsed, note }
  backHref = "/",      // ← 대시보드
  rightSlot = null,    // 우측 상단 버튼/액션
  footerSlot = null,   // 하단 커스텀
}) {
  const lines = String(summary || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="wrap">
        {/* Header */}
        <div className="head">
          <div className="head-left">
            <h1 className="title">{title}</h1>
            {subtitle && <p className="subtitle">{subtitle}</p>}
            <div className="badges">
              {meta?.model && <span className="badge">model: {meta.model}</span>}
              {meta?.articlesUsed != null && (
                <span className="badge">articles: {meta.articlesUsed}</span>
              )}
              {meta?.lastUpdated && (
                <span className="badge">updated: {meta.lastUpdated}</span>
              )}
              {meta?.note && <span className="badge warn">{meta.note}</span>}
            </div>
          </div>
          <div className="head-right">
            {rightSlot}
            {backHref && (
              <a href={backHref} className="btn ghost">← 대시보드</a>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="grid">
          <section className="card">
            <h2 className="card-title">핵심 요약</h2>
            {Array.isArray(bullets) && bullets.length ? (
              <ul className="list">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">요약 항목이 없습니다.</p>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">요약 전문</h2>
            {lines.length ? (
              <div className="summary">
                {lines.map((ln, i) => (
                  <p key={i}>{ln}</p>
                ))}
              </div>
            ) : (
              <p className="muted">표시할 텍스트 요약이 없습니다.</p>
            )}
          </section>
        </div>

        {footerSlot && <div className="footer-slot">{footerSlot}</div>}
      </div>

      {/* styled-jsx: 컴포넌트 자체적으로 보기 좋게 스타일링 */}
      <style jsx>{`
        .wrap {
          max-width: 1100px;
          margin: 24px auto 40px;
          padding: 0 20px;
        }
        .head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          margin-bottom: 16px;
        }
        .title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.2px; }
        .subtitle { margin: 6px 0 0; font-size: 14px; color: #475569; }
        .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .badge {
          font-size: 12px; padding: 4px 8px; border: 1px solid #e5e7eb;
          border-radius: 999px; background: #fff;
        }
        .badge.warn { border-color: #f59e0b; background: #fffbeb; }
        .head-right { display: flex; gap: 8px; align-items: center; }
        .btn.ghost {
          font-size: 13px; color: #334155; text-decoration: none;
          border: 1px solid #e5e7eb; background: #fff; padding: 6px 10px; border-radius: 10px;
        }

        .grid {
          display: grid; gap: 16px;
          grid-template-columns: minmax(0, 1.7fr) minmax(260px, 1fr);
        }
        @media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }

        .card {
          background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px;
        }
        .card-title { margin: 0 0 10px; font-weight: 700; }
        .list { list-style: disc; padding-left: 18px; margin: 0; }
        .list li { margin: 6px 0; line-height: 1.7; font-size: 14px; }
        .summary p { margin: 10px 0; line-height: 1.85; font-size: 15px; color: #0f172a; }
        .muted { color: #64748b; font-size: 14px; }
        .footer-slot { margin-top: 16px; }
      `}</style>
    </>
  );
}
