import fetch from "node-fetch";

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

    const url = `https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/search/NewsSearchAPI?q=${encodeURIComponent(q)}&pageNumber=1&pageSize=5&autoCorrect=true`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "contextualwebsearch-websearch-v1.p.rapidapi.com"
      }
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("News API Error:", r.status, text);
      return res.status(r.status).json({ error: "뉴스 API 호출 실패", detail: text });
    }

    const data = await r.json();
    res.status(200).json(data?.value || []);
  } catch (err) {
    console.error("API news handler error:", err);
    res.status(500).json({ error: err.message });
  }
}