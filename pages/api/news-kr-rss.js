// pages/api/news-kr-rss.js
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
      const mm = r.exec(block);
      if (!mm) return null;
      return mm[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    };
    items.push({
      title: pick("title"),
      url: pick("link"),
      publishedAt: pick("pubDate"),
      source: { name: (xml.includes("<title>") ? (xml.match(/<title>(.*?)<\/title>/i)?.[1] || "RSS") : "RSS") },
      description: pick("description"),
    });
  }
  return items;
}

export default async function handler(req, res) {
  const {
    feeds = "http://www.ktnews.com/rss/allArticle.xml",
    // when unfiltered, we ignore brand/industry/must/exclude
    limit = "120",
    days = "2",
  } = req.query;

  const feedList = String(feeds)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const all = [];
    await Promise.all(
      feedList.map(async (url) => {
        try {
          const r = await fetch(url);
          const xml = await r.text();
          const items = parseRSS(xml);
          all.push(...items);
        } catch {}
      })
    );

    const since = new Date();
    since.setDate(since.getDate() - Math.max(1, Number(days) || 2));

    // Filter by date only
    const filtered = all.filter((a) => {
      const dt = a.publishedAt ? new Date(a.publishedAt) : null;
      if (dt && isFinite(dt.getTime()) && dt < since) return false;
      return true;
    });

    // Sort by publishedAt desc
    filtered.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

    // Dedup by URL
    const seen = new Set();
    const dedup = filtered.filter((a) => {
      const key = a.url || a.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, Math.min(200, Number(limit) || 120));

    res.status(200).json(dedup);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
