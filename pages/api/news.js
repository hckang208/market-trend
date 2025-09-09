export default async function handler(req, res) {
  try {
    const src = (req.query.src || "korea").toString();
    const NEWSAPI = process.env.NEWSAPI; // optional
    const q = src === "korea" ? "의류 OR 패션 OR 소싱 OR 환율 OR 면화" : "apparel OR fashion OR retailer OR cotton OR freight";

    if (!NEWSAPI) {
      // No key → return empty structure so UI still works
      return res.status(200).json({ items: [] });
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=10&language=${src==="korea"?"ko":"en"}&sortBy=publishedAt`;
    const r = await fetch(url, { headers: { "X-Api-Key": NEWSAPI }});
    const j = await r.json();
    const items = (j.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source?.name
    }));
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(200).json({ items: [] });
  }
}
