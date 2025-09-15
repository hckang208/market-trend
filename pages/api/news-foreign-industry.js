// pages/api/news-foreign-industry.js
// Google News RSS (Business of Fashion + Just-Style)
// 캐시 + 타임아웃 + fallback 지원

const CACHE_PATH = "/tmp/news_foreign_cache.json";
const DOMAINS = ["businessoffashion.com", "just-style.com"];
const REGIONS = [
  { hl: "en-US", gl: "US", ceid: "US:en" },
  { hl: "en-GB", gl: "GB", ceid: "GB:en" },
];

function buildQuery(domain, daysHint) {
  const base = `site:${domain}`;
  return daysHint ? `${base}+when:${daysHint}d` : base;
}
function buildUrl(query, region) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=${region.hl}&gl=${region.gl}&ceid=${region.ceid}`;
}

function hostOf(u) { try { return new URL(u).host; } catch { return ""; } }
function norm(h) { return (h || "").toLowerCase().replace(/^www\./, ""); }
function isAllowedHost(h) {
  const s = norm(h);
  return (
    s.endsWith("businessoffashion.com") ||
    s.endsWith("just-style.com") ||
    s.endsWith("news.google.com")
  );
}
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
  } catch {
    return gn;
  }
}

function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("요청 타임아웃")), ms)
  );
}
async function fetchText(url) {
  try {
    const res = await Promise.race([
      fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/rss+xml,text/xml;q=0.9,*/*;q=0.8",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        },
      }),
      timeoutPromise(5000),
    ]);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
function parseFeed(xml) {
  if (!xml) return [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const out = [];
  for (const c of items) {
    const title = unescapeXml(pick(c, "title") || "");
    let link = pick(c, "link") || pick(c, "guid") || "";
    const linkAttr = (c.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    if (!/^https?:/i.test(link)) link = linkAttr || link;
    if (!link) continue;
    if (link.includes("news.google.com")) link = extractOriginalUrl(link);

    const host = hostOf(link);
    if (!isAllowedHost(host)) continue;

    const pub = pick(c, "pubDate") || pick(c, "published") || pick(c, "updated") || "";
    let publishedAtISO = null;
    try {
      publishedAtISO = new Date(pub).toISOString();
    } catch {}
    out.push({
      title,
      link,
      source: norm(host),
      publishedAtISO,
    });
  }
  out.sort((a, b) => new Date(b.publishedAtISO || 0) - new Date(a.publishedAtISO || 0));
  const seen = new Set();
  return out.filter((x) => x.link && !seen.has(x.link) && seen.add(x.link));
}

// ========== 캐시 관련 ==========
async function readCache() {
  try {
    const fs = await import("fs");
    if (!fs.existsSync(CACHE_PATH)) return null;
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return null;
  }
}
async function writeCache(obj) {
  try {
    const fs = await import("fs");
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj));
  } catch {}
}
function shouldRefresh(cache) {
  if (!cache) return true;
  const last = new Date(cache.updatedAtISO);
  return Date.now() - (last?.getTime() || 0) > 6 * 60 * 60 * 1000; // 6시간마다 새로
}

// ========== API Handler ==========
export default async function handler(req, res) {
  const nowISO = new Date().toISOString();
  const debug = String(req.query.debug || "0") === "1";
  try {
    const urlDays = parseInt(String(req.query.days || "14"), 10);
    const urlLimit = parseInt(String(req.query.limit || "60"), 10);
    const days = Number.isFinite(urlDays) && urlDays > 0 ? Math.min(urlDays, 60) : 14;
    const limit = Number.isFinite(urlLimit) && urlLimit > 0 ? Math.min(urlLimit, 120) : 60;

    let cache = await readCache();

    if (!cache || shouldRefresh(cache)) {
      const urls = [];
      for (const d of DOMAINS) for (const r of REGIONS) urls.push(buildUrl(buildQuery(d, null), r));
      for (const d of DOMAINS) for (const r of REGIONS) urls.push(buildUrl(buildQuery(d, days), r));

      let items = [];
      const stats = [];
      for (const u of urls) {
        const xml = await fetchText(u);
        const parsed = parseFeed(xml);
        stats.push({ url: u, xmlBytes: xml ? xml.length : 0, parsed: parsed.length });
        if (parsed.length) items.push(...parsed);
        if (items.length >= limit) break;
      }

      const cutoff = Date.now() - days * 86400000;
      items = items.filter((n) => (Date.parse(n.publishedAtISO || 0) || 0) >= cutoff);
      const seen = new Set(),
        final = [];
      for (const it of items) {
        if (!it.link || seen.has(it.link)) continue;
        seen.add(it.link);
        final.push(it);
        if (final.length >= limit) break;
      }

      cache = {
        ok: true,
        updatedAtISO: nowISO,
        guide: "Google News RSS (BoF + Just-Style)",
        items: final,
        stale: false,
      };
      if (debug) cache.debug = stats;
      await writeCache(cache);
    }

    return res.status(200).json(cache);
  } catch (e) {
    try {
      const cache = await readCache();
      if (cache) {
        cache.stale = true;
        cache.note = "신규 요청 실패 → 캐시 반환";
        cache.error = String(e);
        return res.status(200).json(cache);
      }
    } catch {}
    return res.status(500).json({ ok: false, updatedAtISO: nowISO, items: [], error: String(e) });
  }
}

export const config = { api: { bodyParser: true } };
