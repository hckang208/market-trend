// pages/api/daily-report.js
const BRAND_TERMS = [
  "Walmart","Victoria's Secret","Abercrombie","Carter's","Kohl's","Uniqlo","Fast Retailing",
  "Aerie","Duluth","Under Armour","Aritzia","Amazon","Alibaba"
];
const INDUSTRY_TERMS = ["fashion","textile","garment","apparel"];
const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];

export default async function handler(req, res) {
  const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  try {
    const [indR, brandR, industR, krR] = await Promise.all([
      fetch(`${base}/api/indicators`, { cache: "no-store" }),
      fetch(`${base}/api/news?` + new URLSearchParams({
        brand: BRAND_TERMS.join("|"),
        industry: INDUSTRY_TERMS.join("|"),
        must: "brand,industry",
        language: "en",
        limit: "30",
        days: "7",
      }).toString(), { cache: "no-store" }),
      fetch(`${base}/api/news?` + new URLSearchParams({
        industry: INDUSTRY_TERMS.join("|"),
        language: "en",
        limit: "30",
        days: "7",
      }).toString(), { cache: "no-store" }),
      fetch(`${base}/api/news-kr-rss?` + new URLSearchParams({
        feeds: "http://www.ktnews.com/rss/allArticle.xml",
        days: "2",
        limit: "120",
      }).toString(), { cache: "no-store" }),
    ]);

    const indicators = await indR.json();
    const newsBrand = await brandR.json();
    const newsIndustry = await industR.json();
    const newsKR = await krR.json();

    const stockRows = [];
    for (const s of SYMBOLS) {
      try {
        const r = await fetch(`${base}/api/stocks?symbol=${encodeURIComponent(s)}`, { cache: "no-store" });
        const j = await r.json();
        const price = j.regularMarketPrice ?? null;
        const prev = j.regularMarketPreviousClose ?? null;
        const pct = (isFinite(Number(price)) && isFinite(Number(prev)) && Number(prev) !== 0)
          ? ((Number(price) - Number(prev)) / Number(prev)) * 100
          : (isFinite(Number(j.changePercent)) ? Number(j.changePercent) : 0);
        stockRows.push({ symbol: s, name: j.longName || j.name || s, price, pct });
      } catch (e) {
        stockRows.push({ symbol: s, name: s, price: null, pct: 0, error: true });
      }
    }
    stockRows.sort((a,b) => b.pct - a.pct);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set" });

    const system = `당신은 Hansoll(한솔) 부자재 구매부서 임원에게 보고하는 시니어 컨설턴트입니다.
- 한국어로 핵심을 간결하게 정리하세요.
- 아침 브리핑 용으로 1~2분 내 읽히는 분량으로 작성합니다.
- '오늘의 3가지 핵심' -> '글로벌 vs 한국 요약' -> '리테일러 주가 하이라이트' -> 'Risk/Action' 순서로 Markdown 섹션을 만듭니다.`;

    const payload = {
      indicators,
      stocks: stockRows.slice(0, 8),
      news: {
        brandTop: (Array.isArray(newsBrand) ? newsBrand.slice(0, 8) : []),
        industryTop: (Array.isArray(newsIndustry) ? newsIndustry.slice(0, 6) : []),
        koreaTop: (Array.isArray(newsKR) ? newsKR.slice(0, 8) : [])
      }
    };

    const user = `아래 JSON 데이터를 바탕으로 일일 리포트를 만들어 주세요.
형식: Markdown
1) 오늘의 3가지 핵심 (• 불릿 3개, 한 줄 요약)
2) 글로벌 vs 한국 요약 (각 2줄 이내)
3) 리테일러 주가 하이라이트 (상승 Top2, 하락 Top2 한줄씩)
4) Risk / Action (각 1~2줄)

JSON:
${JSON.stringify(payload, null, 2)}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`OpenAI error: ${txt}`);
    }
    const j = await r.json();
    const markdown = j.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      narrative: markdown,
      meta: {
        indicatorsUpdated: indicators?.lastUpdated || null,
        counts: {
          newsBrand: Array.isArray(newsBrand) ? newsBrand.length : 0,
          newsIndustry: Array.isArray(newsIndustry) ? newsIndustry.length : 0,
          newsKR: Array.isArray(newsKR) ? newsKR.length : 0,
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
