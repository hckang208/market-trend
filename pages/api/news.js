// pages/api/news.js
export default async function handler(req, res) {
  try {
    const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI || "";
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";

    const {
      q = "",                         // 키워드 OR 조합: "Walmart" OR "Target" OR "fashion" ...
      cat = "",                       // "retail,fashion,textile,garment,apparel"
      language = "en",
      limit: rawLimit = "30",
      sortBy = "publishedAt",
    } = req.query;

    const limit = Math.min(Math.max(parseInt(String(rawLimit), 10) || 30, 1), 100);

    // q 가 있으면 q를 우선으로 사용. cat은 보조 키워드로 q에 병합
    const cats = String(cat || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const catExpr = cats.length ? `(${cats.join(" OR ")})` : "";
    const queryExpr = q
      ? catExpr
        ? `(${q}) AND ${catExpr}`
        : `${q}`
      : catExpr || "retail OR fashion OR textile OR garment OR apparel";

    // 1) NewsAPI 우선 시도 (everything)
    if (NEWS_API_KEY) {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", queryExpr);
      url.searchParams.set("pageSize", String(limit));
      url.searchParams.set("language", language);
      url.searchParams.set("sortBy", sortBy);

      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${NEWS_API_KEY}` },
      });
      const j = await r.json();

      // 실패 시 RapidAPI로 폴백
      if (!r.ok || j?.status === "error") {
        return await rapidFallback(queryExpr, limit, res, RAPIDAPI_KEY);
      }

      const items = (j.articles || []).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name || "",
        description: a.description,
        image: a.urlToImage || "",
        publishedAt: a.publishedAt,
      }));
      res.status(200).json(items);
      return;
    }

    // 2) RapidAPI 폴백
    return await rapidFallback(queryExpr, limit, res, RAPIDAPI_KEY);
  } catch (e) {
    res.status(500).send(`news error: ${e.message || e}`);
  }
}

async function rapidFallback(queryExpr, limit, res, RAPIDAPI_KEY) {
  // RapidAPI 키가 없으면 빈 배열
  if (!RAPIDAPI_KEY) {
    res.status(200).json([]);
    return;
  }

  // 예시: Bing News Search (RapidAPI 마켓플레이스에 다수 호스트 존재)
  // 실제 사용 중인 RapidAPI 제공자에 맞게 host 를 조정하세요.
  const host = "bing-news-search1.p.rapidapi.com";
  const url = new URL("https://bing-news-search1.p.rapidapi.com/news/search");
  url.searchParams.set("q", queryExpr);
  url.searchParams.set("count", String(limit));
  url.searchParams.set("freshness", "Week");
  url.searchParams.set("textFormat", "Raw");
  url.searchParams.set("safeSearch", "Off");

  try {
    const r = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": host,
      },
    });
    if (!r.ok) {
      res.status(200).json([]);
      return;
    }
    const j = await r.json();
    const items = (j.value || []).map((a) => ({
      title: a.name,
      url: a.url,
      source: a.provider?.[0]?.name || "",
      description: a.description,
      image: a.image?.thumbnail?.contentUrl || "",
      publishedAt: a.datePublished,
    }));
    res.status(200).json(items);
  } catch {
    res.status(200).json([]);
  }
}
