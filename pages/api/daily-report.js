// pages/api/daily-report.js
import { geminiComplete } from "../../lib/gemini";

const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];

export default async function handler(req, res) {
  const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  try {
    const DOMAINS = process.env.FOREIGN_NEWS_DOMAINS || "businessoffashion.com,just-style.com";
    const [indR, overseasR, krR] = await Promise.all([
      fetch(`${base}/api/indicators`, { cache: "no-store" }),
      // Overseas: simplified keywords, English
      fetch(`${base}/api/news?` + new URLSearchParams({
        domains: DOMAINS,
        industry: "fashion|apparel|garment|textile",
        language: "en",
        limit: "40",
        days: "7",
      }).toString(), { cache: "no-store" }),
      // Domestic: KR textile news RSS (daily)
      fetch(`${base}/api/news-kr-rss?` + new URLSearchParams({
        feeds: "http://www.ktnews.com/rss/allArticle.xml",
        days: "1",
        limit: "200",
      }).toString(), { cache: "no-store" }),
    ]);

    const indicators = await indR.json();
    const newsOverseas = await overseasR.json();
    // removed industry-only list
    const newsKR = await krR.json();

    const stockRows = [];
    for (const s of SYMBOLS) {
      try {
    const DOMAINS = process.env.FOREIGN_NEWS_DOMAINS || "businessoffashion.com,just-style.com";
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

    const system = `당신은 당사 내부 실무진이 즉시 의사결정에 활용할 **컨설팅 수준**의 브리프를 작성하는 시니어 컨설턴트입니다.
- 한국어로 핵심을 간결하게 정리하세요.
- 아침 브리핑 용으로 1~2분 내 읽히는 분량으로 작성합니다.
- '오늘의 3가지 핵심' -> '해외 vs 국내 요약' -> '리테일러 주가 하이라이트' -> 'Risk/Action' 순서로 Markdown 섹션을 만듭니다.`;

    const payload = {
      indicators,
      stocks: stockRows.slice(0, 8),
      news: {
        overseasTop: (Array.isArray(newsOverseas) ? newsOverseas.slice(0, 12) : []),
        koreaTop: (Array.isArray(newsKR) ? newsKR.slice(0, 60) : [])
      }
    };

    const user = `아래 JSON 데이터를 바탕으로 일일 리포트를 만들어 주세요.
형식: Markdown
1) 오늘의 3가지 핵심 (• 불릿 3개, 한 줄 요약)
2) 글로벌 vs 한국 요약 (각 2줄 이내)
3) 리테일러 주가 하이라이트 (상승 Top2, 하락 Top2 한줄씩)
4) Risk / Action (각 1~2줄)

JSON:
${"${"}JSON.stringify(payload, null, 2)${"}"}`;

    const markdown = await geminiComplete({
      system,
      user,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      temperature: 0.4,
      maxOutputTokens: 1000,
    });

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
