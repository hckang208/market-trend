// pages/api/news.js
export default async function handler(req, res) {
  try {
    const {
      q = "",
      brand = "",
      industry = "",
      must = "",
      exclude = "",
      language = "en",
      days = "7",
      limit = "40",
      domains = ""
    } = req.query || {};

    const key = process.env.NEWSAPI;
    if (!key) return res.status(500).json({ error: "NEWSAPI not set" });

    const now = new Date();
    const from = new Date(now.getTime() - (Number(days) || 7) * 24 * 60 * 60 * 1000).toISOString();

    const query = buildQuery({ brand, industry, must, exclude, q });
    const params = new URLSearchParams({
      q: query,
      language,
      searchIn: "title,description",
      sortBy: "publishedAt",
      pageSize: String(Math.min(Number(limit) || 40, 100)),
      from
    });
    if (domains) params.set("domains", String(domains));

    const url = "https://newsapi.org/v2/everything?" + params.toString();
    const r = await fetch(url, { headers: { "X-Api-Key": key }, cache: "no-store" });
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

    // post-filtering
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

    // dedupe by URL/title
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

function buildQuery({ brand = "", industry = "", must = "", exclude = "", q = "" }) {
  const brands = brand.split("|").map((s) => s.trim()).filter(Boolean);
  const inds = industry.split("|").map((s) => s.trim()).filter(Boolean);
  const ex = exclude.split(",").map((s) => s.trim()).filter(Boolean);
  const group = (arr) => (arr.length ? "(" + arr.map((t) => `\"${t}\"`).join(" OR ") + ")" : "");

  const andMode = must.includes("brand") && must.includes("industry");
  let base = "";
  if (andMode && brands.length && inds.length) {
    base = `${group(brands)} AND ${group(inds)}`;
  } else if (brands.length || inds.length) {
    base = [group(brands), group(inds)].filter(Boolean).join(" OR ");
  } else {
    base = "retail OR apparel OR fashion OR textile OR garment";
  }
  const excl = ex.length ? " -" + ex.join(" -") : "";
  const extra = q ? ` ${q}` : "";
  return (base + extra + excl).trim();
}
