import React, { useEffect, useState } from "react";
import Link from "next/link";

function Sectioned({ text }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const blocks = [];
  let cur = { title: "", bullets: [] };
  const flush = () => { if (cur.title || cur.bullets.length) { blocks.push(cur); cur = { title: "", bullets: [] }; } };
  for (const ln of lines) {
    if (ln.startsWith("### ")) { flush(); cur.title = ln.replace(/^###\s+/, ""); }
    else if (/^\s*[-•]\s+/.test(ln)) { cur.bullets.push(ln.replace(/^\s*[-•]\s+/, "")); }
    else { if (ln.trim()) cur.bullets.push(ln.trim()); }
  }
  flush();
  return (
    <div style={{ display:"grid", gap:14 }}>
      {blocks.map((b,i)=>(
        <div key={i} style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:14 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>{b.title || "요약"}</div>
          <ul style={{ margin:0, paddingLeft:18, display:"grid", gap:8 }}>
            {b.bullets.map((t,j)=>(<li key={j} style={{ lineHeight:1.8 }}>{t}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true); setErr("");
        const r = await fetch("/api/ai-news-foreign", { cache:"no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "요약 API 오류");
        setData(j);
      } catch(e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  return (
    <main style={{ maxWidth:1100, margin:"24px auto", padding:"0 16px", fontFamily:"'SUIT Variable','Pretendard','Inter',system-ui,sans-serif" }}>
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <h1 style={{ fontSize:20, fontWeight:900 }}>"해외뉴스AI요약"</h1>
        <Link href="/" legacyBehavior><a style={{ color:"#111827", textDecoration:"underline" }}>← 대시보드로 돌아가기</a></Link>
      </header>

      {loading && (
        <div style={{ border:"1px dashed #cbd5e1", borderRadius:12, background:"#f8fafc", padding:18, color:"#0f172a" }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>GEMINI 2.5가 분석중입니다…</div>
          <div style={{ fontSize:14, color:"#475569" }}>잠시만 기다려 주세요. 최신 해외/국내 기사들을 읽고 전략 요약을 생성하는 중입니다.</div>
        </div>
      )}
      {err && <div style={{ color:"#b91c1c", marginTop:12 }}>에러: {err}</div>}

      {!loading && !err && (
        <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16, alignItems:"start" }}>
          <div style={{ display:"grid", gap:16 }}>
            <Sectioned text={data?.summary || ""} />
          </div>
          <aside style={{ display:"grid", gap:16 }}>
            <div style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:14 }}>
              <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>참고 기사</div>
              <div style={{ display:"grid", gap:10 }}>
                {(data?.items || []).slice(0,20).map((n,i)=>(
                  <a key={i} href={n.link} target="_blank" rel="noreferrer" style={{ color:"#111827", textDecoration:"underline" }}>
                    {i+1}. {n.title}
                  </a>
                ))}
              </div>
              <div style={{ marginTop:10, color:"#64748b", fontSize:12 }}>
                생성: {new Date(data?.generatedAt || Date.now()).toLocaleString("ko-KR")}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
