// pages/api/news.js
function buildQuery({ brand = "", industry = "", must = "", exclude = "" }) {
  const brands = brand.split("|").map((s) => s.trim()).filter(Boolean);
  const inds = industry.split("|").map((s) => s.trim()).filter(Boolean);
  const ex = exclude.split(",").map((s) => s.trim()).filter(Boolean);
  const group = (arr) => (arr.length ? "(" + arr.map((t) => `"${t}"`).join(" OR ") + ")" : "");

  const andMode = must.includes("brand") && must.includes("industry");
  let q = "";
  if (andMode && brands.length && inds.length) {
    q = `${group(brands)} AND ${group(inds)}`;
  } else if (brands.length || inds.length) {
    q = [group(brands), group(inds)].filter(Boolean).join(" OR ");
  } else {
    q = "retail OR apparel OR fashion OR textile OR garment";
  }

  if (ex.length) {
    q += " " + ex.map((t) => `-\"${t}\"`).join(" ");
  }
  return q;
}

export default async function handler(req, res) {
  const {
    brand = "",
    industry = "",
    must = "",
    language = "en",
    limit = "40",
    days = "14",
    domains = "",
    exclude = "",
  } = req.query;

  const NEWS_KEY = process.env.NEWSAPI;
  if (!NEWS_KEY) {
    return res.status(400).json({ error: "NEWSAPI key not set" });
  }

  const q = buildQuery({ brand, industry, must, exclude });

  const from = new Date();
  from.setDate(from.getDate() - Math.max(1, Number(days) || 14));
  const params = new URLSearchParams({
    q,
    language,
    sortBy: "publishedAt",
    pageSize: String(Math.min(100, Number(limit) || 40)),
    from: from.toISOString(),
  });
  if (domains) params.set("domains", domains);

  try {
    const r = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
      headers: { "X-Api-Key": NEWS_KEY },
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`NewsAPI error: ${txt}`);
    }
    const j = await r.json();
    const arr = (j.articles || []).map((a) => ({
      title: a.title,
      url: a.url,
      source: { name: a.source?.name || "" },
      publishedAt: a.publishedAt || a.published_at || a.date || null,
    }));

    const brands = brand.split("|").map((s) => s.toLowerCase()).filter(Boolean);
    const inds = industry.split("|").map((s) => s.toLowerCase()).filter(Boolean);
    const mustBrand = must.includes("brand");
    const mustInd = must.includes("industry");
    const ex = exclude.split(",").map((s) => s.toLowerCase().trim()).filter(Boolean);

    const pass = (t) => {
      const text = (t || "").toLowerCase();
      if (ex.some((w) => text.includes(w))) return false;
      const hasB = brands.length ? brands.some((w) => text.includes(w)) : true;
      const hasI = inds.length ? inds.some((w) => text.includes(w)) : true;
      if (mustBrand && !hasB) return false;
      if (mustInd && !hasI) return false;
      return hasB || hasI;
    };

    const filtered = arr.filter((a) => pass(`${a.title} ${a.source?.name}`));

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
