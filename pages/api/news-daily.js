// pages/api/news-daily.js
// Reuters & NYT RSS → Daily 세계(미국 중심) 주요 뉴스 (ET '어제'만 필터)
const CACHE_PATH = "/tmp/news_daily_cache.json";
const GUIDE_TEXT = "미국/세계 주요 경제 뉴스는 매일 오전 7~9시(한국시간) 기준으로 전일(ET) 뉴스로 요약·표시됩니다.";
const FEEDS = [
  "https://feeds.reuters.com/reuters/businessNews",
  "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml",
];

// ---------- utils ----------
async function fetchWithRetry(url, init = {}, retry = 2, timeoutMs = 8000) {
  for (let i = 0; i <= retry; i++) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(id);
      if (r.ok) return await r.text();
      if (i === retry) throw new Error(`${url} ${r.status}`);
    } catch (e) {
      clearTimeout(id);
      if (i === retry) throw e;
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

function decode(s = "") {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pick(xml = "", tag = "") {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  return decode((m[1] || "").replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim());
}

// Minimal RSS item parse
function parseRSS(xml = "", sourceLabel = "") {
  const out = [];
  const blocks = xml.split(/<item[\\s>]/i).slice(1).map(b => "<item " + b);
  for (const b of blocks) {
    const title = pick(b, "title");
    const link = pick(b, "link") || pick(b, "guid");
    const pub =
      pick(b, "pubDate") ||
      pick(b, "updated") ||
      pick(b, "dc:date") ||
      pick(b, "date");
    if (!title || !link) continue;
    let iso = "";
    try { iso = new Date(pub).toISOString(); } catch {}
    out.push({
      title,
      url: link,
      publishedAtISO: iso || null,
      source: sourceLabel,
    });
  }
  return out;
}

function etDateStr(d = new Date()) {
  // Return 'YYYY-MM-DD' in America/New_York for a given Date
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return fmt.format(d); // 'YYYY-MM-DD'
}

function getYesterdayET() {
  // Yesterday relative to current ET date
  const now = new Date();
  // Compute ET now by formatting then reconstructing start-of-day; simpler: subtract 24h then format
  const y = new Date(now.getTime() - 24 * 3600 * 1000);
  return etDateStr(y);
}

function filterToETDate(items = [], targetEtDate = "") {
  if (!targetEtDate) return items;
  return items.filter(it => {
    if (!it.publishedAtISO) return false;
    const d = new Date(it.publishedAtISO);
    if (!d || isNaN(d.getTime())) return false;
    const et = etDateStr(d);
    return et === targetEtDate;
  });
}

function dedupeByTitle(items = []) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.title || "").trim().toLowerCase().replace(/\\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function shouldRefresh(cache, targetEtDate) {
  if (!cache) return true;
  if (cache.targetEtDate !== targetEtDate) return true; // crossing to next day
  const last = new Date(cache.updatedAtISO);
  if (!last || isNaN(last.getTime())) return true;
  const ageMs = Date.now() - last.getTime();
  return ageMs > 22 * 60 * 60 * 1000; // 22h TTL
}

function readCache() {
  try { return JSON.parse(require("fs").readFileSync(CACHE_PATH, "utf8")); }
  catch { return null; }
}

function writeCache(data) {
  try { require("fs").writeFileSync(CACHE_PATH, JSON.stringify(data)); }
  catch {}
}

// ---------- handler ----------
export default async function handler(req, res) {
  try {
    const force = (req.query.refresh === "1");
    const targetEtDate = req.query.et || getYesterdayET(); // allow manual ?et=YYYY-MM-DD
    let cache = readCache();

    if (force || shouldRefresh(cache, targetEtDate)) {
      let items = [];
      for (const feed of FEEDS) {
        try {
          const xml = await fetchWithRetry(feed);
          const label = /reuters/i.test(feed) ? "Reuters" : "NYTimes";
          items.push(...parseRSS(xml, label));
        } catch (e) {
          // ignore single feed failure
        }
      }
      // Filter to ET 'yesterday' (or requested et=)
      items = filterToETDate(items, targetEtDate)
        .sort((a, b) => (new Date(b.publishedAtISO || 0)) - (new Date(a.publishedAtISO || 0)));
      items = dedupeByTitle(items).slice(0, 50);

      cache = {
        updatedAtISO: new Date().toISOString(),
        guide: GUIDE_TEXT,
        targetEtDate,
        items,
      };
      writeCache(cache);
    }

    return res.status(200).json({
      updatedAtISO: cache.updatedAtISO,
      guide: cache.guide || GUIDE_TEXT,
      targetEtDate: cache.targetEtDate,
      items: cache.items || [],
      count: (cache.items || []).length,
      sources: "Reuters, NYTimes RSS (ET yesterday only)",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
