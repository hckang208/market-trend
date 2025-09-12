// pages/ai/korea.js
import React, { useEffect, useState, useMemo } from "react";

function Block({ title, children }) {
  return (
    <section style={{padding:"16px", margin:"12px 0", border:"1px solid #eee", borderRadius:12}}>
      <h2 style={{margin:"0 0 8px 0", fontSize:18}}>{title}</h2>
      {children}
    </section>
  );
}

export default function AIKoreaNews() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ts, setTs] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/ai-news-korea?ts=${Date.now()}`, { signal: abort.signal, cache: "no-store" });
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        if (!ct.includes("application/json")) throw new Error("Invalid content-type");
        const j = await r.json();
        setData(j);
      } catch (e) {
        if (abort.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => abort.abort();
  }, [ts]);

  const items = useMemo(() => (data?.items || []), [data]);

  return (
    <main style={{maxWidth:900, margin:"0 auto", padding:"20px"}}>
      <h1 style={{margin:"0 0 12px 0"}}>국내 산업 뉴스 · AI 요약</h1>
      <div style={{display:"flex", gap:8}}>
        <button onClick={() => setTs(Date.now())} disabled={loading} style={{padding:"8px 12px", borderRadius:8, border:"1px solid #ddd"}}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {error && <Block title="에러">
        <div style={{color:"#c00"}}>{error}</div>
      </Block>}

      <Block title="요약">
        <pre style={{whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{data?.summary || (loading ? "요약 생성 중…" : "요약이 없습니다.")}</pre>
        {data?.fallback && <div style={{marginTop:8, color:"#666"}}>※ 폴백 요약(키/쿼터 없음 또는 실패)</div>}
      </Block>

      <Block title={`기사 목록 (${items.length}건)`}>
        <ul style={{paddingLeft:18, margin:0}}>
          {items.map((n, idx) => (
            <li key={idx} style={{margin:"8px 0"}}>
              <a href={n.link} target="_blank" rel="noreferrer">{n.title || n.source || "기사"}</a>
              {n.source ? <span style={{color:"#666"}}> · {n.source}</span> : null}
              {n.pubDate ? <span style={{color:"#999"}}> · {n.pubDate}</span> : null}
            </li>
          ))}
          {!items.length && !loading && <li style={{color:"#666"}}>표시할 기사가 없습니다.</li>}
        </ul>
      </Block>
    </main>
  );
}
