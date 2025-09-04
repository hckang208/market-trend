// pages/company/[symbol].js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

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
    <div style={{maxWidth: 1100, margin: "24px auto", padding: "0 16px"}}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{fontSize: 22, fontWeight: 800, margin: 0}}>{symbol} 뉴스 AI 요약</h1>
        <a href={symbol ? `https://finance.yahoo.com/quote/${symbol}` : "#"} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563eb" }}>Yahoo Finance ↗</a>
      </div>
      
      <div style={{display:"flex", gap:12, alignItems:"center", margin:"12px 0"}}>
        <label>개수 <input type="number" min={3} max={20} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{marginLeft:6, width:64}} /></label>
        <label>일수 <input type="number" min={3} max={30} value={days} onChange={e => setDays(Number(e.target.value))} style={{marginLeft:6, width:64}} /></label>
        <label>언어 <select value={lang} onChange={e => setLang(e.target.value)} style={{marginLeft:6}}><option value="ko">한국어</option><option value="en">English</option></select></label>
        <button onClick={() => load({})} disabled={loading} style={{ padding:"6px 12px", borderRadius:8 }}>
          {loading ? "요약 중..." : "다시 요약"}
        </button>
      </div>

      {error && <div style={{color:"crimson", marginBottom:10}}>에러: {error}</div>}
      {!data && !loading && <div>요약을 불러오려면 잠시 기다려 주세요…</div>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          {/* Left: AI Summary (linkified citations) */}
          <div style={{ border:"1px solid #e5e7eb", background:"#f8fafc", padding:16, borderRadius:12 }}>
            <div style={{ fontSize: 13, color:"#64748b", marginBottom: 8 }}>
              {data.companyName} · {data.count}개 기사 · {new Date(data.generatedAt).toLocaleString()}
            </div>
            {htmlSections.length === 0 ? (
              <pre style={{ whiteSpace:"pre-wrap", fontFamily:"inherit", lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: linkifyCitations(data.summary || "").replace(/\n/g, "<br/>") }} />
            ) : (
              htmlSections.map((sec, idx) => (
                <section key={idx} style={{ marginTop: idx===0 ? 0 : 14 }}>
                  {sec.title && <h3 style={{ fontSize: 15, fontWeight: 800, margin:"6px 0" }}>{sec.title}</h3>}
                  <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: sec.html }} />
                </section>
              ))
            )}
          </div>

          {/* Right: Reference news list */}
          <aside style={{ border:"1px solid #e5e7eb", padding: 16, borderRadius: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin:"0 0 8px 0" }}>참조 뉴스</h3>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {(data.items || []).map((it, idx) => (
                <li id={`ref-${idx+1}`} key={idx} style={{ margin:"8px 0" }}>
                  <a href={it.link} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>
                    {it.title}
                  </a>
                  {it.pubDate ? <div style={{ fontSize: 12, color: "#6b7280" }}>{it.pubDate}</div> : null}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{it.source || ""}</div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
