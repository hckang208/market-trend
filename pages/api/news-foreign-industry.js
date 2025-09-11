// pages/api/news-foreign-industry.js
// Google News RSS only (BoF + Just-Style). Minimal CJS, no fs/cache/AbortController, no regex literals.

const ALLOWED = new Set([
  "businessoffashion.com", "www.businessoffashion.com",
  "just-style.com", "www.just-style.com",
]);

const FEEDS = [
  "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en",
];

function hostOf(u) { try { return new URL(u).host; } catch (e) { return ""; } }
function norm(h) { return (h || "").replace(/^www\./, ""); }
function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function pick(xml, tag) {
  const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\/" + tag + ">", "i");
  const m = (xml || "").match(re);
  return m ? decode(m[1]).trim() : "";
}
function attr(xml, tag, attrName) {
  const re = new RegExp("<" + tag + "[^>]*\b" + attrName + "=\"([^\"]+)\"[^>]*>", "i");
  const m = (xml || "").match(re);
  return m ? decode(m[1]) : "";
}
function extractOriginalUrl(gnLink) {
  try {
    const u = new URL(gnLink || "");
    const q = u.searchParams.get("url");
    return q ? decodeURIComponent(q) : (gnLink || "");
  } catch (e) { return gnLink || ""; }
}

async function getText(url) {
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DashboardBot/1.0)",
        "accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
}

function parseItems(xml) {
  if (!xml) return [];
  const itemRe = new RegExp("<item[\\s\\S]*?<\/item>", "gi");
  const entryRe = new RegExp("<entry[\\s\\S]*?<\/entry>", "gi");
  const chunks = (xml.match(itemRe) || xml.match(entryRe) || []);
  const out = [];
  for (const c of chunks) {
    const title = pick(c, "title");
    let link = pick(c, "link") || pick(c, "guid");
    const linkAttr = (c.match(new RegExp("<link[^>]*href=\"([^\"]+)\"", "i")) || [])[1] || "";
    if (!link || !/^https?:/i.test(link)) link = linkAttr || link;
    if (!title || !link) continue;

    // GN -> original
    if (link.includes("news.google.com")) link = extractOriginalUrl(link);

    const pub = pick(c, "pubDate") || pick(c, "published") || pick(c, "updated") || pick(c, "dc:date") || pick(c, "date");
    let publishedAtISO = null;
    try { publishedAtISO = new Date(pub).toISOString(); } catch (e) {}

    const sourceText = pick(c, "source");
    const sourceUrl = attr(c, "source", "url");
    const sourceHost = norm(hostOf(sourceUrl));
    const linkHost = norm(hostOf(link));
    const allowed = ALLOWED.has(linkHost) || ALLOWED.has(sourceHost);
    if (!allowed) continue;

    out.push({
      title,
      url: link,
      source: sourceText || sourceHost || linkHost,
      publishedAtISO,
    });
  }
  return out;
}

function dedupeByTitle(arr) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = (it.title || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function withinDays(iso, days) {
  try {
    const d = new Date(iso || "");
    if (isNaN(d.getTime())) return true;
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff <= days && diff >= 0;
  } catch (e) { return true; }
}

async function handler(req, res) {
  const q = req.query || {};
  const days = Math.max(1, Math.min(30, Number(q.days) || 7));
  const limit = Math.max(1, Math.min(100, Number(q.limit) || 40));
  const debug = q.debug === "1";

  const items = [];
  const errors = [];

  for (const url of FEEDS) {
    const xml = await getText(url);
    if (!xml) {
      errors.push("fetch failed: " + url);
      continue;
    }
    try {
      items.push(...parseItems(xml));
    } catch (e) {
      errors.push("parse failed: " + url + " : " + String(e && e.message || e));
    }
  }

  let arr = dedupeByTitle(items)
    .filter(it => withinDays(it.publishedAtISO, days))
    .sort((a, b) => (new Date(b.publishedAtISO || 0)) - (new Date(a.publishedAtISO || 0)));
  arr = arr.slice(0, limit);

  const payload = {
    updatedAtISO: new Date().toISOString(),
    items: arr,
    count: arr.length,
    sources: "businessoffashion.com, just-style.com",
    guide: "출처: The Business of Fashion, Just-Style (Google News RSS)",
  };
  if (debug) payload._debug = { errors };

  // Always return JSON (no 500 HTML)
  return res.status(200).json(payload);
}

module.exports = handler;
