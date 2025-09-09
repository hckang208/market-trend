// pages/company/[symbol].js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const styles = {
  container: { maxWidth: 1200, margin: "28px auto", padding: "0 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 900, letterSpacing: -0.2 },
  meta: { fontSize: 13, color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 },
  card: { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 16 },
  summary: { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 },
  h3: { fontSize: 15, fontWeight: 800, margin: "8px 0" },
  refTitle: { fontSize: 14, fontWeight: 800, margin: "0 0 8px 0" },
  link: { color: "#1d4ed8", textDecoration: "none" },
  btn: { padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" },
};

function linkifyCitations(markdown) {
  const text = String(markdown || "");
  return text.replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split('-')[0];
    return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;
  });
}

function parseSections(md = "") {
  const lines = String(md).split(/\r?\n/);
  const secs = []; let title = null, buf = [];
  const push = () => { if (title || buf.length) secs.push({ title: title || "", body: buf.join("\n") }); };
  for (const ln of lines) {
    if (/^###\s+/.test(ln)) { push(); title = ln.replace(/^###\s+/, "").trim(); buf = []; }
    else buf.push(ln);
  }
  push();
  return secs;
}

export default function CompanyNewsSummaryPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [limit, setLimit] = useState(10);
  const [days, setDays] = useState(7);
  const [lang, setLang] = useState("ko");

  useEffect(() => { if (symbol) load(); }, [symbol]);

  async function load(custom = {}) {
    const L = custom.limit ?? limit;
    const D = custom.days ?? days;
    const G = custom.lang ?? lang;
    try {
      setLoading(true); setError(""); setData(null);
      const r = await fetch(`/api/company-news-summary?symbol=${encodeURIComponent(symbol)}&limit=${L}&days=${D}&lang=${G}`);
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
  const htmlSections = useMemo(() => sections.map(sec => ({ 
    title: sec.title === "Implications for Hansoll" ? "한솔섬유 전략에 미치는 시사점" : sec.title,
    html: linkifyCitations(sec.body).replace(/^-\s+/gm, "• ").replace(/\n/g, "<br/>")
  })), [sections]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{symbol} 뉴스 AI 요약</h1>
          <div style={styles.meta}>
            {data?.companyName || ""} · {data?.count || 0}개 기사 · {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : ""}
          </div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <a href={symbol ? `https://finance.yahoo.com/quote/${symbol}` : "#"} target="_blank" rel="noreferrer" style={{ ...styles.link, fontSize:13 }}>Yahoo Finance ↗</a>
          <button onClick={() => load({})} disabled={loading} style={styles.btn}>{loading ? "요약 중..." : "다시 요약"}</button>
        </div>
      </div>

      {error && <div style={{color:"crimson", marginBottom:10}}>에러: {error}</div>}

      <div style={{display:"flex", gap:12, alignItems:"center", margin:"12px 0"}}>
        <label>개수 <input type="number" min={3} max={20} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{marginLeft:6, width:64}} /></label>
        <label>일수 <input type="number" min={3} max={30} value={days} onChange={e => setDays(Number(e.target.value))} style={{marginLeft:6, width:64}} /></label>
        <label>언어 <select value={lang} onChange={e => setLang(e.target.value)} style={{marginLeft:6}}><option value="ko">한국어</option><option value="en">English</option></select></label>
      </div>

      {(!data && !loading) && <div>요약을 불러오려면 잠시 기다려 주세요…</div>}

      {data && (
        <div style={styles.grid}>
          <div style={styles.summary}>
            {htmlSections.length === 0 ? (
              <div style={{ fontSize:14, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: linkifyCitations(data.summary || "").replace(/\n/g, "<br/>") }} />
            ) : (
              htmlSections.map((sec, idx) => (
                <section key={idx} style={{ marginTop: idx===0 ? 0 : 14 }}>
                  {sec.title && <h3 style={styles.h3}>{sec.title}</h3>}
                  <div style={{ fontSize:14, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: sec.html }} />
                </section>
              ))
            )}
          </div>

          <aside style={styles.card}>
            <div style={styles.refTitle}>참조 뉴스</div>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {(data.items || []).map((it, idx) => (
                <li id={`ref-${idx+1}`} key={idx} style={{ margin:"8px 0" }}>
                  <a href={it.link} target="_blank" rel="noreferrer" style={styles.link}>
                    {it.title}
                  </a>
                  {it.pubDate ? <div style={{ fontSize: 12, color: "#6b7280" }}>{it.pubDate}</div> : null}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{typeof it.source === "string" ? it.source : (it.source?.name || it.source?.id || "")}</div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
