// pages/api/news-foreign-industry.js
// Google News RSS only (site:businessoffashion.com + site:just-style.com)
// CommonJS export for Netlify Functions (no ESM syntax)

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
    const u = new URL(googleLink);
    const urlParam = u.searchParams.get("url");
    if (urlParam) {
      return decodeURIComponent(urlParam);
    }
    return googleLink;
  } catch (e) {
    return googleLink;
  }
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
      if (r.ok) {
        return await r.text();
      }
      if (i === retry) {
        throw new Error(`${url} ${r.status}`);
      }
    } catch (e) {
      clearTimeout(id);
      if (i === retry) {
        throw e;
      }
      await new Promise((res) => setTimeout(res, 300));
    }
  }
  return "";
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
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  return decodeEntities((m[1] || "").trim());
}

function attr(xml = "", tag = "", attrName = "") {
  const re = new RegExp(`<${tag}[^>]*\b${attrName}="([^"]+)"[^>]*>`, "i");
  const m = xml.match(re);
  return m ? decodeEntities(m[1]) : "";
}

function hostOf(url = "") {
  try {
    return new URL(url).host;
  } catch (e) {
    return "";
  }
}

function normHost(h = "") {
  return (h || "").replace(/^www\./, "");
}

function mapSourceName(text = "") {
  const t = (text || "").toLowerCase();
  if (t.includes("business of fashion")) return "The Business of Fashion";
  if (t.includes("just-style")) return "Just-Style";
  return text || "";
}

function parseRSS(xml = "") {
  const out = [];
  const isRSS = xml.includes("<item");
  const items = isRSS
    ? xml.split(/<item[\s>]/i).slice(1).map((x) => "<item " + x)
    : xml.split(/<entry[\s>]/i).slice(1).map((x) => "<entry " + x);

  for (const c of items) {
    const title = pick(c, "title");
    let link = pick(c, "link") || pick(c, "guid");
    const alt = (c.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    link = (link && link.startsWith("http")) ? link : (alt || link);
    const pub = pick(c, "pubDate") || pick(c, "published") || pick(c, "updated") || pick(c, "dc:date") || pick(c, "date");

    const sourceText = pick(c, "source");
    const sourceUrl = attr(c, "source", "url");
    const sourceHost = normHost(hostOf(sourceUrl));
    const displaySource = mapSourceName(sourceText) || sourceHost || "";

    if (!title || !link) continue;

    if (link.includes("news.google.com")) {
      const maybe = extractOriginalUrl(link);
      link = maybe || link;
    }

    const linkHost = normHost(hostOf(link));
    const allowed = ALLOWED_HOSTS.has(linkHost) || ALLOWED_HOSTS.has(sourceHost);
    if (!allowed) continue;

    let iso = "";
    try { iso = new Date(pub).toISOString(); } catch (e) {}

    out.push({
      title,
      url: link,
      publishedAtISO: iso || null,
      source: displaySource || linkHost,
      host: linkHost || sourceHost,
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
    if (isNaN(d.getTime())) return true;
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff <= days && diff >= 0;
  } catch (e) {
    return true;
  }
}

function readCache() {
  try {
    return JSON.parse(require("fs").readFileSync(CACHE_PATH, "utf8"));
  } catch (e) {
    return null;
  }
}

function writeCache(data) {
  try {
    require("fs").writeFileSync(CACHE_PATH, JSON.stringify(data));
  } catch (e) {}
}

async function handler(req, res) {
  try {
    const { days = "7", limit = "40", refresh = "0" } = req.query || {};
    const d = Math.max(1, Math.min(30, Number(days) || 7));
    const lim = Math.max(1, Math.min(100, Number(limit) || 40));

    const cache = readCache();
    const need = (refresh === "1") || !cache || ((Date.now() - new Date(cache.updatedAtISO).getTime()) > 2 * 3600 * 1000);
    if (!need) {
      return res.status(200).json(cache);
    }

    let items = [];
    for (const feed of GN_RSS) {
      try {
        const xml = await fetchWithRetry(feed);
        items.push(...parseRSS(xml));
      } catch (e) {
        // continue on fetch error
      }
    }

    items = items
      .filter((it) => it && it.url && it.source)
      .filter((it) => withinDays(it.publishedAtISO, d))
      .sort((a, b) => (new Date(b.publishedAtISO || 0)) - (new Date(a.publishedAtISO || 0)));
    items = dedupeByTitle(items).slice(0, lim);

    const payload = {
      updatedAtISO: new Date().toISOString(),
      guide: "출처: The Business of Fashion, Just-Style (Google News RSS)",
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

module.exports = handler;
