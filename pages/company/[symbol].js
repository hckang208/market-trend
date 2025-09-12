// pages/company/[symbol].js
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import AnalysisView from "@/components/AnalysisView";

export default function CompanyAnalysisPage() {
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

  const generatedAtLocal = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "";

  if (loading) {
    return (
      <AnalysisView
        pageTitle={`${symbol} | Company AI Analysis — Hansol MI`}
        title={`${symbol} — Company AI 분석`}
        subtitle={`최근 ${days}일 / ${limit}개 기사`}
        bullets={[]}
        summary="불러오는 중..."
        meta={{ model: "loading", articlesUsed: 0, lastUpdated: new Date().toISOString() }}
        backHref="/"
      />
    );
  }

  if (error) {
    return (
      <AnalysisView
        pageTitle={`${symbol} | Company AI Analysis — Hansol MI`}
        title={`${symbol} — Company AI 분석`}
        subtitle={`최근 ${days}일 / ${limit}개 기사`}
        bullets={[]}
        summary=""
        meta={{
          model: "unknown",
          articlesUsed: 0,
          lastUpdated: new Date().toISOString(),
          note: `에러: ${error}`,
        }}
        backHref="/"
      />
    );
  }

  return (
    <AnalysisView
      pageTitle={`${symbol} | Company AI Analysis — Hansol MI`}
      title={`${symbol} — Company AI 분석`}
      subtitle={`최근 ${days}일 / ${limit}개 기사`}
      bullets={data?.bullets || []}
      summary={data?.summary || ""}
      meta={{
        model: data?.model || "unknown",
        articlesUsed: data?.count || 0,
        lastUpdated: generatedAtLocal,
      }}
      backHref="/"
      rightSlot={
        <button onClick={() => load({})} disabled={loading} className="px-3 py-1 border rounded">
          {loading ? "분석 중…" : "다시 분석"}
        </button>
      }
    />
  );
}
