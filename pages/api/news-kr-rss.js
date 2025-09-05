export default async function handler(req, res) {
  try {
    const { feeds = "", days = "2", limit = "50" } = req.query;
    const feedList = String(feeds).split(",").map(s => s.trim()).filter(Boolean);
    if (!feedList.length) {
      return res.status(400).json({ error: "missing feeds" });
    }

    const sinceMs = Date.now() - (Number(days) || 2) * 24 * 60 * 60 * 1000;
    const max = Math.min(Number(limit) || 50, 500);

    const items = [];
    for (const raw of feedList) {
      const url = normalizeFeedUrl(raw);
      const xml = await fetchWithRetry(url, {
        headers: { "User-Agent": "MarketTrend-Dashboard/1.0 (+news-kr)" }
      }, 2, 8000);
      if (!xml) continue;
      const parsed = parseRSS(xml);
      for (const it of parsed) {
        if (it.pubDate && it.pubDate.getTime() >= sinceMs) items.push({ ...it, source: hostOf(url) });
      }
    }

    items.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));
    const out = items.slice(0, max).map(({ title, link, pubDate, description, source }) => ({
      title, link, date: pubDate?.toISOString() || null, source, description
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

function normalizeFeedUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.toString();
  } catch {
    return u.startsWith("http://") ? u.replace("http://", "https://") : u;
  }
}
function hostOf(u) { try { return new URL(u).host; } catch { return null; } }

async function fetchWithRetry(url, opts = {}, retries = 1, timeoutMs = 7000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const r = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(id);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === retries) return null;
      await wait(400 + i * 400);
    }
  }
  return null;
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function parseRSS(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const title = pick(b, "title");
    const link = pick(b, "link");
    const pub = pick(b, "pubDate") || pick(b, "dc:date");
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
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : null;
}
function unescapeXml(s) {
  if (!s) return s;
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#039;/g, "'");
}
function cleanDesc(s) {
  if (!s) return s;
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
