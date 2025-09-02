const cache = new Map();
export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });

    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "q 파라미터 필요" });

    const cacheKey = q.toLowerCase();
    const now = Date.now();
    if (cache.has(cacheKey)) {
      const { data, ts } = cache.get(cacheKey);
      if (now - ts < 300000) return res.status(200).json(data);
    }

    const url = `https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/search/NewsSearchAPI?q=${encodeURIComponent(q)}&pageNumber=1&pageSize=5&autoCorrect=true`;
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "contextualwebsearch-websearch-v1.p.rapidapi.com"
      }
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "뉴스 API 실패", detail: t, q });
    }
    const data = await r.json();
    const list = data?.value || [];
    cache.set(cacheKey, { data: list, ts: now });
    res.status(200).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
