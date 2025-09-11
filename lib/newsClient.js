// lib/newsClient.js
export async function getJsonWithFallback(primaryUrl, fallbackUrl) {
  const tryFetch = async (u) => {
    const r = await fetch(`${u}${u.includes("?") ? "&" : "?"}ts=${Date.now()}`, { cache: "no-store" });
    const ct = (r.headers.get("content-type")||"").toLowerCase();
    if (!ct.includes("application/json")) throw new Error("non-json");
    return await r.json();
  };
  try {
    return await tryFetch(primaryUrl);
  } catch {
    return await tryFetch(fallbackUrl);
  }
}
export async function getOverseasNews() {
  return getJsonWithFallback("/data/news_overseas.json", "/api/news-foreign-industry?days=7&limit=100");
}
export async function getKoreaNews() {
  return getJsonWithFallback("/data/news_korea.json", "/api/news-kr-rss?days=7&limit=200");
}
