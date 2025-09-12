// lib/newsClient.js (핵심 fetchJSON만 교체하거나, 아래 유틸을 추가로 사용하세요.)
export async function fetchJSON(url) {
  const finalUrl = url + (url.includes("?") ? "&" : "?") + "ts=" + Date.now();
  const r = await fetch(finalUrl, {
    cache: "no-store",
    headers: { accept: "application/json" }
  });
  const txt = await r.text();
  const ct = (r.headers.get("content-type") || "").toLowerCase();

  // JSON 응답에서만 파싱
  const data = ct.includes("application/json") && txt ? JSON.parse(txt) : null;

  // 실패 시 HTML 본문을 그대로 JSON.parse하지 않아 `Unexpected token '<'` 회피
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Invalid content-type for ${url}`);
  }
  return data;
}
