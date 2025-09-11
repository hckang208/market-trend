// lib/newsClient.js
// Unified client for Overseas/Korea industry news with static JSON (9am KST) first, API fallback.
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) {
    throw new Error("JSON parse failed for " + url + ": " + String(e) + (txt ? " | body: " + txt.slice(0, 140) : ""));
  }
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || txt || ("HTTP " + r.status);
    throw new Error(msg);
  }
  return data;
}

export async function getOverseasNews() {
  try {
    const j = await fetchJSON("/data/news_overseas.json");
    return j;
  } catch (e) {}
  try {
    const data = await fetchJSON("/api/news-foreign-industry?days=7&limit=40");
    return Array.isArray(data) ? { items: data } : data;
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function getKoreaNews() {
  try {
    const j = await fetchJSON("/data/news_korea.json");
    return j;
  } catch (e) {}
  try {
    const data = await fetchJSON("/api/news-kr-daily");
    return Array.isArray(data) ? { items: data } : data;
  } catch (e) {
    return { items: [], error: String(e) };
  }
}
