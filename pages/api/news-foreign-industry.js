// pages/api/news-foreign-industry.js
// Source of truth for "산업 → 해외뉴스": Google News RSS (Business of Fashion, Just-Style only).
// Always returns JSON (even on error).

const FEEDS = [
  "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en",
];
const ALLOWED = new Set([
  "businessoffashion.com","www.businessoffashion.com",
  "just-style.com","www.just-style.com"
]);

function hostOf(u) { try { return new URL(u).host; } catch { return ""; } }
function norm(h) { return (h||"").replace(/^www\./,""); }
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}
function unescapeXml(s) {
  if (!s) return s;
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
function extractOriginalUrl(gn) {
  try {
    const u = new URL(gn);
    const url = u.searchParams.get("url");
    return url || gn;
  } catch { return gn; }
}
async function fetchText(url) {
  try {
    const r = await fetch(url, { cache: "no-store", headers: { "accept": "application/rss+xml,text/xml;q=0.9,*/*;q=0.8" } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}
function parseFeed(xml) {
  if (!xml) return [];
  const chunks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const out = [];
  for (const c of chunks) {
    const rawTitle = pick(c, "title") || "";
    const title = unescapeXml(rawTitle);
    let link = pick(c, "link") || pick(c, "guid") || "";
    const linkAttr = (c.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    if (!/^https?:/i.test(link)) link = linkAttr || link;
    if (!link) continue;
    if (link.includes("news.google.com")) link = extractOriginalUrl(link);
    const host = norm(hostOf(link));
    if (!ALLOWED.has(host)) continue;

    const pub = pick(c,"pubDate") || pick(c,"published") || pick(c,"updated") || "";
    let publishedAtISO = null; try { publishedAtISO = new Date(pub).toISOString(); } catch {}
    out.push({
      title,
      link,
      source: host,
      sourceHost: host,
      linkHost: host,
      publishedAtISO
    });
  }
  // Sort desc by time
  out.sort((a,b) => (new Date(b.publishedAtISO || 0)) - (new Date(a.publishedAtISO || 0)));
  // Dedup by link
  const seen = new Set();
  return out.filter(x => (x.link && !seen.has(x.link) && seen.add(x.link)));
}

export default async function handler(req, res) {
  const nowISO = new Date().toISOString();
  try {
    const urlDays = parseInt(String(req.query.days || "7"), 10);
    const days = Number.isFinite(urlDays) && urlDays > 0 ? Math.min(urlDays, 30) : 7;
    const urlLimit = parseInt(String(req.query.limit || "40"), 10);
    const limit = Number.isFinite(urlLimit) && urlLimit > 0 ? Math.min(urlLimit, 100) : 40;

    let items = [];
    for (const u of FEEDS) {
      const xml = await fetchText(u);
      const parsed = parseFeed(xml);
      items.push(...parsed);
    }
    // Filter by days
    const cutoff = Date.now() - days * 86400000;
    items = items.filter(n => {
      const t = Date.parse(n.publishedAtISO || 0) || 0;
      return t >= cutoff;
    });
    // Limit
    items = items.slice(0, limit);

    const payload = {
      ok: true,
      updatedAtISO: nowISO,
      guide: "Source: Google News (Business of Fashion, Just-Style)",
      items
    };
    try { return res.status(200).json(payload); } catch { return res.end(JSON.stringify(payload)); }
  } catch (e) {
    const payload = { ok: false, updatedAtISO: nowISO, items: [], error: String(e) };
    try { return res.status(200).json(payload); } catch { return res.end(JSON.stringify(payload)); }
  }
}
