
import React, { useEffect, useState } from "react";

export default function AISummaryPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [foreign, setForeign] = useState(null);
  const [korea, setKorea] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const [rf, rk] = await Promise.all([
          fetch("/api/ai-news-foreign"),
          fetch("/api/ai-news-korea")
        ]);
        const jf = await rf.json();
        const jk = await rk.json();
        if (!rf.ok) throw new Error(jf?.error || "해외뉴스 요약 실패");
        if (!rk.ok) throw new Error(jk?.error || "국내뉴스 요약 실패");
        setForeign(jf);
        setKorea(jk);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <a href="/" style={styles.link}>&larr; 돌아가기</a>
          <h1 style={{ margin:0, fontSize:18 }}>AI 뉴스 요약</h1>
        </div>
        <div style={{ color:"#6b7280", fontSize:12 }}>출처: 해외(Just-Style, Business of Fashion), 국내(한국섬유신문)</div>
        <div style={{ fontSize:12, color:"#6b7280" }}>GEMINI 2.5 사용중</div>
      </header>

      {err && <div style={{ ...styles.box, borderColor:"#fecaca", background:"#fef2f2", color:"#7f1d1d" }}>에러: {err}</div>}

      <div style={{ fontSize:12, color:"#6b7280", marginBottom:8 }}>분석 시각: {new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>

      <div style={styles.layout}>
        <main style={styles.main}>
          <section style={styles.box}>
            <h2 style={styles.h2}>해외뉴스 요약 from Just-Style & Business of Fashion</h2>
            <div style={styles.summary}>{foreign?.summary || (loading ? "요약 중…" : "—")}</div>
          </section>
          <section style={styles.box}>
            <h2 style={styles.h2}>국내뉴스 요약 from 한국섬유신문</h2>
            <div style={styles.summary}>{korea?.summary || (loading ? "요약 중…" : "—")}</div>
          </section>
        </main>
        <aside style={styles.aside}>
          <section style={styles.box}>
            <h3 style={styles.h3}>참고한 해외뉴스</h3>
            <ul style={styles.list}>
              {(foreign?.items || []).map((n, i) => (
                <li key={i}><a href={n.link} target="_blank" rel="noreferrer" style={styles.link}>{n.title}</a><div style={styles.meta}>{n.source} • {n.date || ""}</div></li>
              ))}
            </ul>
          </section>
          <section style={styles.box}>
            <h3 style={styles.h3}>참고한 국내뉴스</h3>
            <ul style={styles.list}>
              {(korea?.items || []).map((n, i) => (
                <li key={i}><a href={n.link} target="_blank" rel="noreferrer" style={styles.link}>{n.title}</a><div style={styles.meta}>{n.source} • {n.date || ""}</div></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin:"20px auto", padding:"0 16px", fontFamily: '"Pretendard", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  layout: { display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16, alignItems:"start" },
  main: { display:"grid", gap:16 },
  aside: { display:"grid", gap:16 },
  box: { border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:14 },
  h2: { margin:"0 0 10px 0", fontSize:17, fontWeight:900 },
  h3: { margin:"0 0 8px 0", fontSize:14, fontWeight:800, color:"#111827" },
  summary: { whiteSpace:"pre-wrap", lineHeight:1.8, fontSize:15, letterSpacing:"0.1px" },
  list: { listStyle:"disc", paddingLeft:18, margin:"0 0 0 0", display:"grid", gap:8 },
  meta: { color:"#6b7280", fontSize:12 },
  link: { color:"#111827", textDecoration:"underline" },
};
