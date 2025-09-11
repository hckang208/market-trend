// pages/api/news-kr-daily.js
const CACHE_PATH = "/tmp/news_kr_daily_cache.json";
const GUIDE_TEXT = "뉴스는 매일 오후 10시(한국시간)에 갱신됩니다.";
const FEEDS = ["http://www.ktnews.com/rss/allArticle.xml", "https://www.ktnews.com/rss/allArticle.xml"];

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
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch { return null; }
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
  const age = Date.now() - (last?.getTime() || 0);
  return age > 22 * 60 * 60 * 1000;
}
function hostOf(u="") { try { return new URL(u).host; } catch { return ""; } }

function parseRSS(xml="") {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const title = pick(b, "title");
    const link = pick(b, "link");
    const pub = pick(b, "pubDate") || pick(b, "updated") || pick(b, "dc:date");
    const desc = pick(b, "description");
    items.push({
      title: unescapeXml(title),
      link: unescapeXml(link),
      pubDate: pub ? new Date(pub) : null,
      description: cleanDesc(unescapeXml(desc))
    });
  }
  return items;
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
  return m ? m[1].trim() : null;
}
function unescapeXml(s) {
  if (!s) return s;
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}
function cleanDesc(s) {
  if (!s) return s;
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
  try {
    const refresh = String(req.query.refresh || "0") === "1";
    let cache = await readCache();

    if (!cache || shouldRefresh(cache) || refresh) {
      let xml = null;
      for (const u of FEEDS) {
        try {
          xml = await fetchWithRetry(u, { headers: { "User-Agent": "MarketTrend/1.0 (+news-kr-daily)" }, cache: "no-store" }, 2, 8000);
          if (xml) break;
        } catch {}
      }
      if (!xml) throw new Error("KTNEWS RSS 로드 실패");

      let items = parseRSS(xml).map(it => ({
        title: it.title || "",
        url: it.link || "",
        publishedAt: it.pubDate ? it.pubDate.toISOString() : null,
        source: hostOf(it.link || "") || "ktnews.com",
        description: it.description || ""
      }));

      items.sort((a,b) => (new Date(b.publishedAt||0)) - (new Date(a.publishedAt||0)));
      items = items.slice(0, 150);

      const now = new Date();
      cache = {
        ok: true,
        guide: GUIDE_TEXT,
        updatedAtISO: now.toISOString(),
        updatedAtKST: formatKST(now),
        items,
        stale: false
      };
      await writeCache(cache);
    }

    return res.status(200).json(cache);
  } catch (e) {
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
