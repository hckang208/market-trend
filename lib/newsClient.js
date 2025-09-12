// lib/newsClient.js
// Unified client for Overseas/Korea industry news with static JSON first, API fallback with staleness check.

function cacheBust(url) {
  return url + (url.includes("?") ? "&" : "?") + "ts=" + Date.now();
}

async function fetchJSON(url) {
  const r = await fetch(cacheBust(url), { cache: "no-store", headers: { accept: "application/json" } });
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

  let latestAgeHrs = 999;
  if (Array.isArray(payload.items) && payload.items.length) {
    const iso = payload.items[0].publishedAtISO || payload.items[0].pubDate || payload.items[0].date || "";
    const t = Date.parse(iso) || 0;
    if (t) latestAgeHrs = (now - t) / 36e5;
  }
  // Stale if updatedAt older than 20h OR latest item older than 36h
  return ageHrs > 20 || latestAgeHrs > 36;
}

export async function getOverseasNews() {
  // 1) Live API (Google News via BoF/Just-Style)
  try {
    const data = await fetchJSON("/api/news-foreign-industry?days=30&limit=80");
    const obj = Array.isArray(data) ? { items: data } : (data || {});
    if (!obj.updatedAtISO) obj.updatedAtISO = new Date().toISOString();
    return obj;
  } catch (e) {
    // 2) Fallback to static
    try {
      const j = await fetchJSON("/data/news_overseas.json");
      if (!j.updatedAtISO) j.updatedAtISO = new Date().toISOString();
      return j;
    } catch (_) {
      return { items: [], error: String(e) };
    }
  }
}

export async function getKoreaNews() {
  // 1) Try static (prefer if fresh)
  try {
    const j = await fetchJSON("/data/news_korea.json");
    if (!isStale(j)) return j;
  } catch (e) { /* ignore, fallback to API */ }

  // 2) Live API
  try {
    const data = await fetchJSON("/api/news-kr-daily?limit=40&refresh=1");
    const obj = Array.isArray(data) ? { items: data } : (data || {});
    if (!obj.updatedAtISO) obj.updatedAtISO = new Date().toISOString();
    return obj;
  } catch (e) {

    // 3) Final fallback to static (even if stale)
    try {
      const j = await fetchJSON("/data/news_korea.json");
      if (!j.updatedAtISO) j.updatedAtISO = new Date().toISOString();
      return j;
    } catch (_) {
      return { items: [], error: String(e) };
    }
  }
}
