import fetch from "node-fetch";

// 간단 캐싱 (메모리 저장: Vercel serverless 환경에서는 요청마다 초기화되므로 edge config/redis 쓰는게 최적)
// 여기서는 5분(300초) 캐시
const cache = new Map();

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
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
        // 5분 이내 → 캐시 응답
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
      console.error("News API Error:", r.status, text);
      return res
        .status(r.status)
        .json({ error: "뉴스 API 호출 실패", detail: text });
    }

    const data = await r.json();
    const news = data?.value || [];

    // 캐싱 저장
    cache.set(cacheKey, { data: news, timestamp: now });

    res.status(200).json(news);
  } catch (err) {
    console.error("API news handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
