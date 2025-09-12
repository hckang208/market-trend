// lib/newsClient.js
// 안전한 fetchJSON + 대시보드에서 사용하던 함수들(named export) 복구
// 사용처 예시:
//   import { getOverseasNews, getKoreaNews } from "../lib/newsClient";

function cacheBust(url) {
  const ts = Date.now();
  return url + (url.includes("?") ? "&" : "?") + "ts=" + ts;
}

export async function fetchJSON(url) {
  const r = await fetch(cacheBust(url), {
    cache: "no-store",
    headers: { accept: "application/json" }
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
export async function getOverseasNews({ days = 7, limit = 40 } = {}) {
  const url = `/api/news-foreign-industry?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`;
  return await fetchJSON(url);
}

export async function getKoreaNews({ days = 7, limit = 40 } = {}) {
  // 프로젝트에 따라 news-kr-daily 또는 news-kr-rss를 사용
  const url = `/api/news-kr-daily?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`;
  return await fetchJSON(url);
}

// 필요시 확장용
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
