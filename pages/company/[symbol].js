// pages/company/[symbol].js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

function HeaderBar() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-mark">H</div>
          <div>
            <div className="logo-text">Hansol Market Intelligence</div>
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
      <p className="footer-text">© Hansol Textile — Market Intelligence Dashboard</p>
    </footer>
  );
}

const styles = {
  container: { maxWidth: 1200, margin: "32px auto", padding: "0 24px" },
  meta: { fontSize: 13, color: "#6b7280" },
  h3: { fontSize: 15, fontWeight: 800, margin: "10px 0 6px" },
  link: { color: "#1d4ed8", textDecoration: "none" },
  btn: { padding: "8px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" },
};

function linkifyCitations(markdown) {
  const text = String(markdown || "");
  return text.replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split("-")[0];
    return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;
  });
}

function parseSections(md = "") {
  const lines = String(md).split(/\r?\n/);
  const secs = [];
  let title = null,
    buf = [];
  const push = () => {
    if (title || buf.length) secs.push({ title: title || "", body: buf.join("\n") });
  };
  for (const ln of lines) {
    if (/^###\s+/.test(ln)) {
      push();
      title = ln.replace(/^###\s+/, "").trim();
      buf = [];
    } else buf.push(ln);
  }
  push();
  return secs;
}

export default function CompanyNewsSummaryPage() {
  const router = useRouter();
  const raw = router.query.symbol;
  const symbol = Array.isArray(raw) ? raw[0] : raw;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [limit, setLimit] = useState(10);
  const [days, setDays] = useState(7);
  const [lang, setLang] = useState("ko");

  useEffect(() => {
    if (symbol) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function load(custom = {}) {
    if (!symbol) return;
    const L = custom.limit ?? limit;
    const D = custom.days ?? days;
    const G = custom.lang ?? lang;
    try {
      setLoading(true);
      setError("");
      setData(null);
      const r = await fetch(
        `/api/company-news-summary?symbol=${encodeURIComponent(
          symbol
        )}&limit=${L}&days=${D}&lang=${G}`
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to fetch");
      setData(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => parseSections(data?.summary || ""), [data?.summary]);
  const htmlSections = useMemo(
    () =>
      sections.map((sec) => ({
        title:
          sec.title === "Implications for Hansoll"
            ? "한솔섬유 전략에 미치는 시사점"
            : sec.title,
        html: linkifyCitations(sec.body).replace(/^-\s+/gm, "• ").replace(/\n/g, "<br/>"),
      })),
    [sections]
  );

  const generatedAtLocal = useMemo(() => {
    if (!data?.generatedAt) return "";
    try {
      return new Date(data.generatedAt).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      });
    } catch {
      return data.generatedAt;
    }
  }, [data?.generatedAt]);

  return (
    <>
      <Head>
        <title>
          {symbol ? `${symbol} | Company AI Analysis — Hansol MI` : "Company AI Analysis"}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeaderBar />

      {loading && (
        <div className="loading-overlay">AI Analysis • GEMINI 2.5 분석중입니다</div>
      )}

      <div style={styles.container}>
        {/* 상단 헤더 */}
        <div className="company-header">
          <div>
            <h1 className="company-title">
              {symbol || "—"} <span className="company-title-sub">뉴스 AI 요약</span>
            </h1>
            <div style={styles.meta}>
              {data?.companyName || ""}
              {data?.companyName ? " · " : ""}
              {data?.count != null ? `${data.count}개 기사` : ""}
              {data?.count != null && data?.generatedAt ? " · " : ""}
              {generatedAtLocal || ""}
            </div>
          </div>
          <div className="header-actions">
            <a
              href="/"
              className="ghost-link"
              title="대시보드로 이동"
              aria-label="대시보드로 이동"
            >
              ← 대시보드
            </a>
            <a
              href={symbol ? `https://finance.yahoo.com/quote/${symbol}` : "#"}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles.link, fontSize: 13 }}
            >
              Yahoo Finance ↗
            </a>
            <button onClick={() => load({})} disabled={loading} style={styles.btn}>
              {loading ? "AI 분석 중..." : "AI 분석 다시 시도"}
            </button>
          </div>
        </div>

        {/* 컨트롤 바 */}
        <div className="controls">
          <label className="ctrl">
            <span>개수</span>
            <input
              type="number"
              min={3}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </label>
          <label className="ctrl">
            <span>일수</span>
            <input
              type="number"
              min={3}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <label className="ctrl">
            <span>언어</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>
          <button
            onClick={() => load({ limit, days, lang })}
            disabled={loading || !symbol}
            className="apply-btn"
            title="현재 설정으로 다시 요약"
          >
            {loading ? "적용 중…" : "적용"}
          </button>
        </div>

        {error && <div className="error">에러: {error}</div>}

        {!data && !loading && <div className="muted">요약을 불러오려면 잠시 기다려 주세요…</div>}

        {data && (
          <div className="grid">
            <div className="summary">
              {htmlSections.length === 0 ? (
                <div
                  className="summary-body"
                  dangerouslySetInnerHTML={{
                    __html: linkifyCitations(data.summary || "").replace(/\n/g, "<br/>"),
                  }}
                />
              ) : (
                htmlSections.map((sec, idx) => (
                  <section key={idx} className="section-block">
                    {sec.title && <h3 style={styles.h3}>{sec.title}</h3>}
                    <div
                      className="summary-body"
                      dangerouslySetInnerHTML={{ __html: sec.html }}
                    />
                  </section>
                ))
              )}
            </div>

            <aside className="refs-card">
              <div className="refs-title">참조 뉴스</div>
              <ol className="refs-list">
                {(data.items || []).map((it, idx) => (
                  <li id={`ref-${idx + 1}`} key={idx} className="refs-item">
                    <a href={it.link} target="_blank" rel="noreferrer" style={styles.link}>
                      {it.title}
                    </a>
                    {it.pubDate ? (
                      <div className="refs-meta">{it.pubDate}</div>
                    ) : null}
                    <div className="refs-source">
                      {typeof it.source === "string"
                        ? it.source
                        : it.source?.name || it.source?.id || ""}
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </div>

      <FooterBar />

      {/* scoped styles for readability / spacing */}
      <style jsx>{`
        .company-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 16px;
        }
        .company-title {
          margin: 0 0 4px 0;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.2px;
          line-height: 1.25;
        }
        .company-title-sub {
          font-weight: 700;
          color: #334155;
        }
        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .ghost-link {
          font-size: 13px;
          color: #334155;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 6px 10px;
          border-radius: 10px;
        }
        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin: 16px 0 14px;
        }
        .ctrl {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          border-radius: 10px;
        }
        .ctrl input,
        .ctrl select {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 13px;
          min-width: 80px;
          background: #fff;
        }
        .apply-btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 13px;
        }
        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(260px, 1fr);
          gap: 20px;
          margin-top: 8px;
        }
        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px 20px;
        }
        .section-block + .section-block {
          margin-top: 16px;
          padding-top: 4px;
          border-top: 1px dashed #e2e8f0;
        }
        .summary-body {
          line-height: 1.8;
          font-size: 15px;
          color: #0f172a;
        }
        .refs-card {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          background: #fff;
          position: sticky;
          top: 16px;
          height: fit-content;
        }
        .refs-title {
          font-size: 14px;
          font-weight: 800;
          margin: 0 0 8px 0;
        }
        .refs-list {
          list-style: decimal inside;
          display: grid;
          gap: 10px;
          padding: 0;
          margin: 0;
        }
        .refs-item {
          padding-left: 2px;
          line-height: 1.6;
        }
        .refs-meta {
          font-size: 12px;
          color: #6b7280;
        }
        .refs-source {
          font-size: 11px;
          color: #94a3b8;
        }
        .error {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          padding: 10px 12px;
          border-radius: 10px;
          margin: 8px 0 0;
        }
        .muted {
          color: #64748b;
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
