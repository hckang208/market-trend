// pages/ai/foreign.js
import React from "react";
import Head from "next/head";

function LinkifyCitations(text="") {
  return String(text).replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split('-')[0];
    return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;
  });
}
function splitSections(md="") {
  const lines = String(md).split(/\r?\n/);
  const out=[]; let title=null, buf=[];
  const push=()=>{ if(title||buf.length) out.push({title:title||"", body:buf.join("\n")}); };
  for(const ln of lines){ if(/^###\s+/.test(ln)){ push(); title=ln.replace(/^###\s+/,"").trim(); buf=[]; } else buf.push(ln); }
  push(); return out;
}

const styles = {
  page: { maxWidth: 1080, margin: "0 auto", padding: "16px 16px 40px" },
  h1: { fontSize: 22, fontWeight: 800, margin: "6px 0 14px" },
  sub: { color:"#6b7280", fontSize:12, marginBottom: 12 },
  row: { display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" },
  card: { border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:14 },
  right: { position:"sticky", top:12 },
  btnPro: { padding:"8px 12px", borderRadius:8, border:"1px solid #111827", background:"#111827", color:"#fff", fontWeight:700, fontSize:14 },
  badge: { display:"inline-flex", alignItems:"center", gap:8, padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:999, background:"#fff", color:"#111827", fontWeight:700 },
  spinner: { display:"inline-block", width:10, height:10, borderRadius:999, background:"#111827", animation: "pulse 1s ease-in-out infinite" },
  list: { listStyle:"none", margin:0, padding:0 },
  li: { padding:"8px 0", borderBottom:"1px solid #f1f5f9" },
  refTitle: { fontWeight:700 },
  refMeta: { color:"#6b7280", fontSize:12 }
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

  const sections = React.useMemo(() => splitSections(data?.summary||""), [data?.summary]);
  const updated = data?.updatedAtISO || data?.ts || "";

  return (
    <>
      <Head>
        <title>해외뉴스 | AI 요약</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={styles.page}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <h1 style={styles.h1}>해외뉴스 — AI 요약</h1>
          <button onClick={load} style={styles.btnPro} disabled={loading}>
            {loading ? "다시 요약 중…" : "다시 요약"}
          </button>
        </div>
        <div style={styles.sub}>
          <span style={styles.badge}>
            <span style={styles.spinner} />
            {loading ? "AI가 분석중입니다" : "AI 분석 완료"}
          </span>
          {updated ? <> · 업데이트: {new Date(updated).toLocaleString("ko-KR")}</> : null}
        </div>

        {err && <div style={{ color:"#b91c1c", marginTop:8 }}>에러: {err}</div>}

        <div style={styles.row}>
          <div style={styles.card}>
            {!data && loading && <div>요약을 불러오는 중…</div>}
            {data && sections.map((sec, idx) => (
              <section key={idx} style={{ marginTop: idx===0?0:12 }}>
                {sec.title ? <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>
                  {sec.title === "Implications for Hansoll" ? "한솔섬유 전략에 미치는 시사점" : sec.title}
                </h3> : null}
                <div
                  style={{ whiteSpace:"pre-wrap", lineHeight:1.65 }}
                  dangerouslySetInnerHTML={{ __html: LinkifyCitations(sec.body).replace(/^-\\s+/gm, "• ").replace(/\\n/g, "<br/>") }}
                />
              </section>
            ))}
          </div>

          <aside style={{ ...styles.card, ...styles.right }}>
            <h4 style={{ fontWeight:800, margin:"0 0 8px" }}>참조 뉴스</h4>
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
            </ol>
          </aside>
        </div>
      </main>
      <style jsx global>{`
        @keyframes pulse {{
          0% {{ opacity: 0.4 }}
          50% {{ opacity: 1 }}
          100% {{ opacity: 0.4 }}
        }}
      `}</style>
    </>
  );
}
