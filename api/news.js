import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 NEWS_API_KEY 없음" });
    }

    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "q 파라미터 필요" });
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();

    if (!data.articles) {
      return res.status(500).json({ error: "뉴스 불러오기 실패", raw: data });
    }

    const articles = data.articles.map(a => ({
      title: a.title,
      url: a.url,
      source: a.source.name,
      publishedAt: a.publishedAt
    }));

    res.status(200).json({ articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
