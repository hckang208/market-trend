// pages/company/[symbol].js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function CompanyNewsSummaryPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [limit, setLimit] = useState(10);
  const [days, setDays] = useState(7);
  const [lang, setLang] = useState("ko");

  useEffect(() => {
    if (!symbol) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function load(custom={}) {
    const L = custom.limit ?? limit;
    const D = custom.days ?? days;
    const G = custom.lang ?? lang;
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`/api/company-news-summary?symbol=${encodeURIComponent(symbol)}&limit=${L}&days=${D}&lang=${G}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to fetch summary");
      setData(j);
    } catch (e) {
      setError(String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth: 920, margin: "24px auto", padding: "0 16px"}}>
      <h1 style={{fontSize: 24, fontWeight: 700}}>회사 뉴스 요약: {symbol || ""}</h1>
      <div style={{display: "flex", gap: 8, alignItems: "center", margin: "12px 0"}}>
        <label>개수
          <input type="number" min={3} max={20} value={limit} onChange={e => setLimit(Number(e.target.value))} style={{marginLeft: 6, width: 64}} />
        </label>
        <label>일수
          <input type="number" min={3} max={30} value={days} onChange={e => setDays(Number(e.target.value))} style={{marginLeft: 6, width: 64}} />
        </label>
        <label>언어
          <select value={lang} onChange={e => setLang(e.target.value)} style={{marginLeft: 6}}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
        <button onClick={() => load({})} disabled={loading} style={{padding: "6px 12px", borderRadius: 8}}>
          {loading ? "불러오는 중..." : "다시 요약"}
        </button>
        <a href={symbol ? `https://finance.yahoo.com/quote/${symbol}` : "#"} target="_blank" rel="noreferrer" style={{marginLeft: "auto"}}>
          Yahoo Finance로 이동 ↗
        </a>
      </div>

      {error && <div style={{color: "crimson", marginBottom: 12}}>에러: {error}</div>}

      {!data && !loading && <div>요약을 불러오려면 잠시 기다려 주세요…</div>}

      {data && (
        <div>
          <div style={{fontSize: 14, color: "#666"}}>
            {data.companyName} · {data.count}개 기사 · {new Date(data.generatedAt).toLocaleString()}
          </div>

          <h2 style={{marginTop: 16}}>요약</h2>
          <pre style={{whiteSpace: "pre-wrap", fontFamily: "inherit", background: "#fafafa", padding: 12, borderRadius: 8, lineHeight: 1.6}}>
            {data.summary}
          </pre>

          <h2>기사 목록</h2>
          <ol>
            {(data.items || []).map((it, idx) => (
              <li key={idx} style={{margin: "8px 0"}}>
                <a href={it.link} target="_blank" rel="noreferrer">{it.title}</a>
                {it.pubDate ? <div style={{fontSize: 12, color: "#777"}}>{it.pubDate}</div> : null}
                <div style={{fontSize: 12, color: "#aaa"}}>{it.source}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
