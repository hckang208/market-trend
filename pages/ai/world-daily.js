// pages/ai/world-daily.js
import React, { useEffect, useState, useMemo, useRef } from "react";
import Head from "next/head";

/* ─────────────── 공통 헤더/푸터 ─────────────── */
function HeaderBar() {
  return (
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
  );
}

function FooterBar() {
  return (
    <footer className="footer">
      <p className="footer-text">© Hansoll Textile — Market Intelligence Dashboard</p>
    </footer>
  );
}

/* ─────────────── 인용/하이라이트 유틸 ─────────────── */
function linkifyCitations(markdown) {
  const text = String(markdown || "");
  return text.replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split("-")[0];
    return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;
  });
}

/* ─────────────── 페이지 ─────────────── */
export default function WorldDailyAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [refs, setRefs] = useState([]);
  const [error, setError] = useState("");

  const summaryRef = useRef(null);
  const refsRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setSummary("");
      setRefs([]);

      const r = await fetch("/api/ai-news-foreign", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "요약 실패");

      setSummary(j.summary || "");
      setRefs(j.items || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>World Daily | AI Analysis — Hansol MI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeaderBar />

      {loading && <div className="loading-overlay">AI Analysis • GEMINI 2.5 분석중입니다</div>}

      <div style={{ maxWidth: 1200, margin: "32px auto", padding: "0 24px" }}>
        <div className="company-header">
          <div>
            <h1 className="company-title">
              Daily World News <span className="company-title-sub">AI 요약</span>
            </h1>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Reuters · NYTimes 등</div>
          </div>
          <div className="header-actions">
            <a href="/" className="ghost-link">← 대시보드</a>
            <button onClick={load} disabled={loading} className="btn btn-secondary">
              {loading ? "AI 분석 중..." : "AI 분석 다시 시도"}
            </button>
          </div>
        </div>

        {error && <div className="error">에러: {error}</div>}
        {!summary && !loading && <div className="muted">아직 요약이 없습니다.</div>}

        {summary && (
          <div className="grid">
            <div className="summary" ref={summaryRef}
              dangerouslySetInnerHTML={{ __html: linkifyCitations(summary).replace(/\n/g, "<br/>") }} />
            
            <aside className="refs-card" ref={refsRef}>
              <div className="refs-title">참조 뉴스</div>
              <ol className="refs-list">
                {(refs || []).map((it, idx) => (
                  <li id={`ref-${idx+1}`} key={idx} className="refs-item">
                    <a href={it.url} target="_blank" rel="noreferrer" style={{ color:"#1d4ed8" }}>
                      {it.title}
                    </a>
                    <div className="refs-meta">{it.source || ""}</div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </div>

      <FooterBar />

      <style jsx>{`
        .company-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; }
        .company-title { font-size:26px; font-weight:900; margin:0; }
        .company-title-sub { font-weight:700; color:#334155; }
        .ghost-link { font-size:13px; color:#334155; text-decoration:none; border:1px solid #e5e7eb; padding:6px 10px; border-radius:10px; }
        .grid { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr); gap:20px; }
        .summary { background:#f8fafc; border:1px solid #e5e7eb; border-radius:14px; padding:18px 20px; line-height:1.8; font-size:15px; }
        .refs-card { border:1px solid #e5e7eb; border-radius:14px; padding:16px; background:#fff; height:fit-content; }
        .refs-title { font-size:14px; font-weight:800; margin-bottom:8px; }
        .refs-list { list-style:decimal inside; display:grid; gap:10px; padding:0; margin:0; }
        .refs-item { line-height:1.6; }
        .refs-meta { font-size:12px; color:#6b7280; }
        .error { color:#b91c1c; background:#fef2f2; border:1px solid #fee2e2; padding:10px 12px; border-radius:10px; margin-top:8px; }
        .muted { color:#64748b; font-size:14px; }
      `}</style>
    </>
  );
}
