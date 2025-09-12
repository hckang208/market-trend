// lib/newsClient.js
// Unified client for Overseas/Korea industry news with static JSON (9am KST) first, API fallback.
async function fetchJSON(url) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "ts=" + Date.now(), { cache: "no-store", headers: { accept: "application/json" } });
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

function isStale(payload) {
  if (!payload) return true;
  const now = Date.now();
  const updated = Date.parse(payload.updatedAtISO || payload.updatedISO || 0) || 0;
  const ageHrs = (now - updated) / 36e5;
  const latestItemISO = payload.items && payload.items.length ? payload.items[0].publishedAtISO || payload.items[0].pubDate || "" : "";
  const latestAgeHrs = latestItemISO ? (now - (Date.parse(latestItemISO) || 0)) / 36e5 : 999;
  return ageHrs > 20 || latestAgeHrs > 36;
}

export async function getOverseasNews() {
  try {
    const j = await fetchJSON("/data/news_overseas.json");
    if (!isStale(j)) return j;
  } catch (e) {}
  try {
    const data = await fetchJSON("/api/news-foreign-industry");
    return Array.isArray(data) ? { items: data } : data;
  } catch (e) {
    try { return await fetchJSON("/data/news_overseas.json"); } catch {}
    return { items: [], error: String(e) };
  }
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
    if (!isStale(j)) return j;
  } catch (e) {}
  try {
    const data = await fetchJSON("/api/news-kr-daily");
    return Array.isArray(data) ? { items: data } : data;
  } catch (e) {
    try { return await fetchJSON("/data/news_korea.json"); } catch {}
    return { items: [], error: String(e) };
  }
} catch (e) {}
  try {
    const data = await fetchJSON("/api/news-kr-daily");
    return Array.isArray(data) ? { items: data } : data;
  } catch (e) {
    return { items: [], error: String(e) };
  }
}
