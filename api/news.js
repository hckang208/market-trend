// 간단 캐시 (서버리스 환경은 cold start마다 초기화됨 → 실서비스는 Redis 추천)
const cache = new Map();

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음 (Vercel Settings 확인 필요)" });
    }

    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "q 파라미터 필요" });
    }

    const cacheKey = q.toLowerCase();
    const now = Date.now();

    if (cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey);
      if (now - timestamp < 300_000) {
        // 5분 캐시
        console.log("Cache hit:", q);
        return res.status(200).json(data);
      }
    }

    const url = `https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/search/NewsSearchAPI?q=${encodeURIComponent(
      q
    )}&pageNumber=1&pageSize=5&autoCorrect=true`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "contextualwebsearch-websearch-v1.p.rapidapi.com",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("News API Error:", q, r.status, text);
      return res.status(r.status).json({
        error: "뉴스 API 호출 실패",
        query: q,
        detail: text,
      });
    }

    const data = await r.json();
    const news = data?.value || [];

    cache.set(cacheKey, { data: news, timestamp: now });

    res.status(200).json(news);
  } catch (err) {
    console.error("API news handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
