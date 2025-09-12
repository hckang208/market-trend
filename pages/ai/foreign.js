// pages/ai/foreign.js
import React from "react";
import Head from "next/head";
import AnalysisPanel from "../../components/AnalysisPanel";

/* ───────── 상단 공통 Header/하단 Footer (index.js와 동일 톤) ───────── */
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

/* ───────── 페이지 레이아웃 ───────── */
const styles = {
  page: { maxWidth: 1080, margin: "20px auto", padding: "0 16px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  layout: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" },
  right: { position: "sticky", top: 16, alignSelf: "start" },
  list: { listStyle: "none", margin: 0, padding: 0 },
  li: { padding: "8px 0", borderBottom: "1px solid #f1f5f9" },
  refTitle: { fontWeight: 700, lineHeight: 1.45 },
  refMeta: { color: "#6b7280", fontSize: 12 },
};

export default function AISummaryPage() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  async function load() {
    try {
      setLoading(true); setErr(""); setData(null);
      const r = await fetch("/api/ai-news-foreign");
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setData(j);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); }, []);

  const updated = data?.generatedAt || data?.updatedAtISO || data?.ts || "";

  return (
    <>
      <Head><title>AI 요약 · 해외 산업뉴스</title></Head>

      <HeaderBar />

      <main style={styles.page}>
        <div className="section-header">
          <div>
            <h2 className="section-title">해외 산업뉴스 · AI요약</h2>
            <p className="section-subtitle">Google News · BoF / Just-Style 기반 추출</p>
          </div>
          <div>
            <a href="/" className="btn btn-secondary">대시보드로 돌아가기</a>
          </div>
        </div>

        <div style={styles.layout}>
          <AnalysisPanel
            title="해외 산업뉴스 AI분석"
            loading={loading}
            error={err}
            summary={data?.summary || ""}
            updatedAt={updated}
            onBack={() => { window.location.href = "/"; }}
          />

          <aside style={styles.right}>
            <div className="card">
              <h4 className="text-[13px] font-extrabold mb-2">참조 뉴스</h4>
              <ol style={styles.list}>
                {(data?.items || []).slice(0, 24).map((it, i) => (
                  <li key={i} style={styles.li} id={`ref-${i+1}`}>
                    <div style={styles.refTitle}>
                      <a href={it.link} target="_blank" rel="noreferrer" style={{ color:"#111827", textDecoration:"none" }}>{it.title}</a>
                    </div>
                    {it.pubDate ? <div style={styles.refMeta}>{it.pubDate}</div> : null}
                    <div style={{ ...styles.refMeta, fontSize:11 }}>{it.source || ""}</div>
                  </li>
                ))}
                {(!data?.items || data?.items?.length === 0) && (
                  <li style={{ ...styles.li, color:"#6b7280" }}>참조 뉴스가 없습니다.</li>
                )}
              </ol>
            </div>
          </aside>
        </div>
      </main>

      <FooterBar />
    </>
  );
}
