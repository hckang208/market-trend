// lib/newsClient.js
// 안전한 fetchJSON + 대시보드에서 사용하던 함수들(named export)
// 사용처 예시:
//   import { getOverseasNews, getKoreaNews } from "../lib/newsClient";

function cacheBust(url) {
  const ts = Date.now();
  return url + (url.includes("?") ? "&" : "?") + "ts=" + ts;
}

export async function fetchJSON(url) {
  const r = await fetch(cacheBust(url), {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  const txt = await r.text();
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  const data = ct.includes("application/json") && txt ? JSON.parse(txt) : null;

  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Invalid content-type for ${url}`);
  }
  return data;
}

// ==============
// 기존 사용 함수
// ==============

// 해외 산업 뉴스 (foreign)
export async function getOverseasNews({ days = 7, limit = 40 } = {}) {
  // 캐시 적용된 API 라우트 호출
  const url = `/api/news-foreign-daily?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`;
  return await fetchJSON(url);
}

// 국내 산업 뉴스 (korea)
export async function getKoreaNews({ days = 7, limit = 40 } = {}) {
  // 캐시 적용된 API 라우트 호출
  const url = `/api/news-kr-daily?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`;
  return await fetchJSON(url);
}

// 세계 뉴스 (World Daily) — 필요시 확장
export async function getWorldDaily({ days = 1 } = {}) {
  const url = `/api/news-daily?days=${encodeURIComponent(days)}`;
  return await fetchJSON(url);
}

export default {
  fetchJSON,
  getOverseasNews,
  getKoreaNews,
  getWorldDaily,
};
