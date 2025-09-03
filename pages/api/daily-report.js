// pages/daily-report.js
import React, { useEffect, useState } from "react";
import Head from "next/head";

export default function DailyReportPage() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/daily-report");
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "failed");
        setState({ loading: false, error: "", data: j });
      } catch (e) {
        setState({ loading: false, error: String(e), data: null });
      }
    })();
  }, []);

  return (
    <>
      <Head><title>AI Daily Report</title></Head>
      <main style={{maxWidth:900, margin:"0 auto", padding:16}}>
        <h1 style={{fontSize:24, fontWeight:900, margin:"8px 0 12px"}}>🤖 AI Daily Report</h1>
        {state.loading && <div>불러오는 중...</div>}
        {state.error && <div style={{color:"#b91c1c"}}>에러: {state.error}</div>}
        {state.data && (
          <article style={{whiteSpace:"pre-wrap", lineHeight:1.65, border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"#fff"}}>
            {state.data.summary}
          </article>
        )}
      </main>
    </>
  );
}
