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
      source: { name: "한국섬유신문" },
      description: pick("description"),
    });
  }
  return items;
}

export default async function handler(req, res) {
  const {
    feeds = "http://www.ktnews.com/rss/allArticle.xml",
    brand = "",
    industry = "",
    must = "",
    limit = "40",
    days = "30",
    exclude = "",
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
        } catch {
          // ignore individual feed errors
        }
      })
    );

    const since = new Date();
    since.setDate(since.getDate() - Math.max(1, Number(days) || 30));

    const brands = brand.split("|").map((s) => s.toLowerCase()).filter(Boolean);
    const inds = industry.split("|").map((s) => s.toLowerCase()).filter(Boolean);
    const mustBrand = must.includes("brand");
    const mustInd = must.includes("industry");
    const ex = exclude.split(",").map((s) => s.toLowerCase().trim()).filter(Boolean);

    const pass = (a) => {
      const text = `${a.title || ""} ${a.description || ""}`.toLowerCase();
      if (ex.some((w) => text.includes(w))) return false;
      const hasB = brands.length ? brands.some((w) => text.includes(w)) : true;
      const hasI = inds.length ? inds.some((w) => text.includes(w)) : true;
      if (mustBrand && !hasB) return false;
      if (mustInd && !hasI) return false;
      const dt = a.publishedAt ? new Date(a.publishedAt) : null;
      if (dt && isFinite(dt.getTime()) && dt < since) return false;
      return hasB || hasI;
    };

    const filtered = all.filter(pass).slice(0, Math.min(100, Number(limit) || 40));

    const seen = new Set();
    const dedup = filtered.filter((a) => {
      const key = a.url || a.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.status(200).json(dedup);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
