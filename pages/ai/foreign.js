// pages/ai/foreign.js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import LoadingOverlay from "../../components/LoadingOverlay";
import AnalysisView from "../../components/AnalysisView";

async function fetchJSON(url, init) {
  const res = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers || {}) }});
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const body = await res.text();
    throw new Error(`API did not return JSON (${res.status}). body: ${body.slice(0, 200)}...`);
  }
  return res.json();
}
function deriveBulletsFromSummary(text, max = 6) {
  const t = String(text || "").trim();
  if (!t) return [];
  const lines = t.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const bullets = lines.filter((ln) => /^[-•\*]\s+/.test(ln)).map((ln) => ln.replace(/^[-•\*]\s+/, ""));
  if (bullets.length) return bullets.slice(0, max);
  const sentences = t.split(/(?<=[.!?…])\s+/).filter((s) => s.length > 10);
  return sentences.slice(0, max);
}

export default function IndustryAIForeignPage() {
  const router = useRouter();
  const days  = useMemo(() => Number(router.query.days ?? 7), [router.query.days]);
  const limit = useMemo(() => Number(router.query.limit ?? 30), [router.query.limit]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState("");
  const [bullets, setBullets] = useState([]);
  const [model, setModel] = useState(null);
  const [articlesUsed, setArticlesUsed] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await fetchJSON(`/api/ai-news-foreign?days=${days}&limit=${limit}`);
        if (!alive) return;
        if (!data?.ok) {
          setError(data?._meta?.error || "AI 요약 생성 실패");
        }
        setSummary(data?.summary || "");
        setBullets(Array.isArray(data?.bullets) && data.bullets.length ? data.bullets : deriveBulletsFromSummary(data?.summary));
        setModel(data?.model || "unknown");
        setArticlesUsed(data?.articlesUsed || 0);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "요약 요청 오류");
        setSummary("");
        setBullets([]);
        setModel("unknown");
        setArticlesUsed(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days, limit]);

  return (
    <>
      <SiteHeader />
      {loading && <LoadingOverlay text="AI Analysis • GEMINI 2.5 분석중입니다" />}

      <AnalysisView
        pageTitle="Industry AI Analysis — Hansol MI"
        title="산업뉴스 AI 분석 (해외)"
        subtitle={`기간: 최근 ${days}일 · 기사 상한: ${limit}건`}
        bullets={bullets}
        summary={summary}
        meta={{
          model: model || "unknown",
          articlesUsed,
          lastUpdated: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
          note: error ? `오류: ${error}` : null,
        }}
        backHref="/"
        rightSlot={
          <button onClick={() => router.replace(router.asPath)} className="btn ghost">
            새로고침
          </button>
        }
      />

      <SiteFooter />
    </>
  );
}
