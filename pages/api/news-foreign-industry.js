// pages/api/news-foreign-industry.js
// Google News RSS only (site:businessoffashion.com + site:just-style.com)
// No NewsAPI keys required. Strictly filters to the two domains.

const ALLOWED_HOSTS = new Set([
  "businessoffashion.com",
  "www.businessoffashion.com",
  "just-style.com",
  "www.just-style.com",
]);

const GN_RSS = [
  "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en",
];

const CACHE_PATH = "/tmp/news_foreign_industry_cache.json";

function extractOriginalUrl(googleLink = "") {
  try {
    // Many GN links are like https://news.google.com/rss/articles/....?hl=...&gl=...&ceid=... 
    // Sometimes they include "url=" query param with the original URL.
    const u = new URL(googleLink);
    const urlParam = u.searchParams.get("url");
    if (urlParam) {
      const decoded = decodeURIComponent(urlParam);
      return decoded;
    }
    // Some GN links are amp or redirectors without url=; fall back to the GN link
    return googleLink;
  } catch { return googleLink; }
}

async function fetchWithRetry(url, init = {}, retry = 2, timeoutMs = 10000) {
  for (let i = 0; i <= retry; i++) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; DashboardBot/1.0)",
          "accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
        },
      });
      clearTimeout(id);
      if (r.ok) return await r.text();
      if (i === retry) throw new Error(`${url} ${r.status}`);
    } catch (e) {
      clearTimeout(id);
      if (i === retry) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

function decodeEntities(s = "") {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
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
  return decodeEntities((m[1] || "").trim());
}

function parseRSS(xml = "") {
  const out = [];
  const items = xml.includes("<item")
    ? xml.split(/<item[\s>]/i).slice(1).map((x) => "<item " + x)
    : xml.split(/<entry[\s>]/i).slice(1).map((x) => "<entry " + x);
  for (const c of items) {
    const title = pick(c, "title");
    // RSS: <link>...</link>, Atom: <link href="..."/>
    let link = pick(c, "link") || pick(c, "guid");
    const alt = (c.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    link = (link && link.startsWith("http")) ? link : (alt || link);
    if (link && link.includes("news.google.com")) {
      link = extractOriginalUrl(link);
    }
    const pub = pick(c, "pubDate") || pick(c, "published") || pick(c, "updated") || pick(c, "dc:date") || pick(c, "date");
    if (!title || !link) continue;
    let iso = "";
    try { iso = new Date(pub).toISOString(); } catch {}
    let host = "";
    try { host = new URL(link).host; } catch {}
    out.push({
      title,
      url: link,
      publishedAtISO: iso || null,
      source: host.replace(/^www\./, ""),
      host,
    });
  }
  return out;
}

function dedupeByTitle(items = []) {
  const seen = new Set();
  const res = [];
  for (const it of items) {
    const key = (it.title || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    res.push(it);
  }
  return res;
}

function withinDays(iso, days = 7) {
  try {
    const d = new Date(iso || "");
    if (isNaN(d.getTime())) return true; // keep if unknown
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff <= days && diff >= 0;
  } catch { return true; }
}

function readCache() {
  try { return JSON.parse(require("fs").readFileSync(CACHE_PATH, "utf8")); }
  catch { return null; }
}
function writeCache(data) {
  try { require("fs").writeFileSync(CACHE_PATH, JSON.stringify(data)); }
  catch {}
}

export default async function handler(req, res) {
  try {
    const { days = "7", limit = "40", refresh = "0" } = req.query || {};
    const d = Math.max(1, Math.min(30, Number(days) || 7));
    const lim = Math.max(1, Math.min(100, Number(limit) || 40));

    const cache = readCache();
    const need = refresh === "1" || !cache || ((Date.now() - new Date(cache.updatedAtISO).getTime()) > 2 * 3600 * 1000);
    if (!need) {
      return res.status(200).json(cache);
    }

    let items = [];
    for (const feed of GN_RSS) {
      try {
        const xml = await fetchWithRetry(feed);
        items.push(...parseRSS(xml));
      } catch (e) {
        // continue
      }
    }

    // Strictly allow only BoF / Just-Style hosts
    items = items.filter(it => it && it.url && it.host && ALLOWED_HOSTS.has(it.host));

    items = items
      .filter((it) => withinDays(it.publishedAtISO, d))
      .sort((a, b) => (new Date(b.publishedAtISO || 0)) - (new Date(a.publishedAtISO || 0)));

    items = dedupeByTitle(items).slice(0, lim);

    const payload = {
      updatedAtISO: new Date().toISOString(),
      guide: "출처: The Business of Fashion, Just-Style (Google News RSS only)",
      items,
      count: items.length,
      sources: "businessoffashion.com, just-style.com",
    };
    writeCache(payload);
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
