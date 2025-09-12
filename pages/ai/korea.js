// pages/ai/korea.js
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import AnalysisView from "@/components/AnalysisView";

async function fetchJSON(url, init) {
  const res = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers || {}) }});
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const body = await res.text();
    throw new Error(`API did not return JSON (status ${res.status}). body: ${body.slice(0, 200)}...`);
  }
  return res.json();
}

export default function IndustryAIKoreaPage() {
  const router = useRouter();
  const days  = useMemo(() => Number(router.query.days ?? 7), [router.query.days]);
  const limit = useMemo(() => Number(router.query.limit ?? 30), [router.query.limit]);

  const [state, setState] = useState({
    loading: true,
    error: null,
    summary: "",
    bullets: [],
    model: null,
    articlesUsed: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const data = await fetchJSON(`/api/ai-news-korea?days=${days}&limit=${limit}`);
        if (!alive) return;
        if (!data?.ok) {
          setState({
            loading: false,
            error: data?._meta?.error || "AI 요약 생성 실패",
            summary: data?.summary || "",
            bullets: data?.bullets || [],
            model: data?.model || "unknown",
            articlesUsed: data?.articlesUsed || 0,
          });
          return;
        }
        setState({
          loading: false,
          error: null,
          summary: data.summary || "",
          bullets: Array.isArray(data.bullets) ? data.bullets : [],
          model: data.model || null,
          articlesUsed: data.articlesUsed || 0,
        });
      } catch (e) {
        if (!alive) return;
        setState({
          loading: false,
          error: e.message || "요약 요청 중 오류",
          summary: "",
          bullets: [],
          model: "unknown",
          articlesUsed: 0,
        });
      }
    })();
    return () => { alive = false; };
  }, [days, limit]);

  if (state.loading) {
    return (
      <AnalysisView
        pageTitle="Industry AI Analysis (KR) — Hansol MI"
        title="산업뉴스 AI 분석 (국내)"
        subtitle={`기간: 최근 ${days}일 · 기사 상한: ${limit}건`}
        bullets={[]}
        summary="불러오는 중..."
        meta={{ model: state.model || "loading", articlesUsed: state.articlesUsed, lastUpdated: new Date().toISOString() }}
        backHref="/"
      />
    );
  }

  const errNote = state.error ? `오류: ${state.error}` : null;

  return (
    <AnalysisView
      pageTitle="Industry AI Analysis (KR) — Hansol MI"
      title="산업뉴스 AI 분석 (국내)"
      subtitle={`기간: 최근 ${days}일 · 기사 상한: ${limit}건`}
      bullets={state.bullets}
      summary={state.summary}
      meta={{
        model: state.model || "unknown",
        articlesUsed: state.articlesUsed,
        lastUpdated: new Date().toISOString(),
        note: errNote,
      }}
      backHref="/"
    />
  );
}
