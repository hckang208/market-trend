// pages/api/news-daily.js
/**
 * 해외 산업 뉴스(BoF, Just-Style)를 Google News RSS로 수집해
 * 매일 22:00 KST 기준으로 캐시하여 제공합니다.
 * - 캐시 파일: /tmp/news_daily_cache.json
 * - 응답: { ok, guide, updatedAtISO, updatedAtKST, items[], stale }
 */
 
const CACHE_PATH = "/tmp/news_daily_cache.json";
const GUIDE_TEXT = "뉴스는 매일 오후 10시(한국시간)에 갱신됩니다.";

// Simple fetch-with-retry
async function fetchWithRetry(url, init={}, retry=2, timeoutMs=8000) {
  for (let i=0;i<=retry;i++) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(id);
      if (r.ok) return await r.text();
    } catch (e) {
      clearTimeout(id);
      if (i === retry) throw e;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

// Minimal RSS parser (title/link/pubDate)
function parseRSS(xml="") {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1).map(b => "<item " + b);
  for (const b of blocks) {
    const title = pick(b, "title");
    const link = pick(b, "link");
    const pub = pick(b, "pubDate") || pick(b, "updated") || pick(b, "dc:date");
    items.push({
      title: unescapeXml(title),
      link: unescapeXml(link),
      pubDate: pub ? new Date(pub) : null,
    });
  }
  return items;
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : null;
}
function unescapeXml(s) {
  if (!s) return s;
  return s
    .replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}
function hostOf(u="") { try { return new URL(u).host; } catch { return ""; } }

// KST helpers
function nowKST() {
  const now = new Date();
  const kstOffset = 9 * 60; // minutes
  const localOffset = now.getTimezoneOffset(); // minutes
  const diffMs = (kstOffset + localOffset) * 60 * 1000;
  return new Date(now.getTime() + diffMs);
}
function formatKST(d) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).format(d);
  } catch { return d?.toISOString() || ""; }
}

async function readCache() {
  try {
    const fs = await import("fs");
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch { return null; }
}
async function writeCache(data) {
  try {
    const fs = await import("fs");
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
  } catch {}
}

// Determine whether we should refresh (after 22:00 KST daily, or ?refresh=1)
function shouldRefresh(cache) {
  const urlParams = new URLSearchParams();
  // Can't access req here; we'll allow manual ?refresh=1 in handler logic.
  if (!cache) return true;
  // If cache is older than 24h, refresh.
  const last = new Date(cache.updatedAtISO);
  const ageMs = Date.now() - (last?.getTime() || 0);
  if (ageMs > 22 * 60 * 60 * 1000) return true;
  // same-day usage: keep unless manual refresh
  return false;
}

export default async function handler(req, res) {
  try {
    const refresh = String(req.query.refresh || "0") === "1";
    let cache = await readCache();

    if (!cache || shouldRefresh(cache) || refresh) {
      // Build Google News RSS "site:" queries for each domain
      const feeds = [
        "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
        "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en"
      ];

      const xmls = await Promise.allSettled(
        feeds.map(u => fetchWithRetry(u, { headers: { "User-Agent": "MarketTrend-Dashboard/1.0 (+news-foreign)" } }, 2, 8000))
      );
      let items = [];
      for (let i=0;i<feeds.length;i++) {
        const r = xmls[i];
        if (r.status === "fulfilled" && r.value) {
          const parsed = parseRSS(r.value);
          for (const it of parsed) {
            items.push({
              title: it.title || "",
              url: it.link || "",
              publishedAt: it.pubDate ? it.pubDate.toISOString() : null,
              source: hostOf(feeds[i]).includes("google") ? hostOf(it.link || "") : hostOf(feeds[i])
            });
          }
        }
      }
      // Deduplicate by URL/title
      const seen = new Set();
      items = items.filter(it => {
        const key = (it.url || it.title).trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // Sort by date desc
      items.sort((a,b) => (new Date(b.publishedAt||0)).getTime() - (new Date(a.publishedAt||0)).getTime());
      // Trim to 80
      items = items.slice(0, 80);

      const now = new Date();
      const payload = {
        ok: true,
        guide: GUIDE_TEXT,
        updatedAtISO: now.toISOString(),
        updatedAtKST: formatKST(now),
        items,
        stale: false
      };
      await writeCache(payload);
      cache = payload;
    }

    // Serve
    return res.status(200).json(cache);
  } catch (e) {
    // Last resort: try to serve cache if available
    try {
      const cache = await readCache();
      if (cache) {
        cache.stale = true;
        cache.note = "오류로 캐시를 반환했습니다.";
        cache.error = String(e);
        return res.status(200).json(cache);
      }
    } catch {}
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

export const config = { api: { bodyParser: true } };
