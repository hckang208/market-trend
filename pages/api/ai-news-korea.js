// pages/api/ai-news-korea.js
import { geminiComplete } from "../../lib/gemini";

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map((n) => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

export default async function handler(req, res) {
  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  let items = [];
  try {
    const r = await fetch(`${base}/api/news-kr-daily`, { cache: "no-store" });
    const j = r.ok ? await r.json() : { items: [] };
    items = (j?.items || []).slice(0, 10).map(n => ({
      title: n.title,
      link: n.link,
      pubDate: n.publishedAtISO || n.pubDate || null,
      source: n.source || n.sourceHost || ""
    }));
  } catch (_) {
    items = [];
  }

  if (!process.env.GEMINI_API_KEY) {
    const summary = bulletsFromItems(items);
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary: summary || "• (로컬) 국내 뉴스가 부족합니다.",
      scope: "korea",
      fallback: true
    });
  }

  try {
    const user = [
      "아래 국내 패션/리테일 관련 기사 목록을 보고 5~8줄 한국어 불릿 요약을 작성해줘.",
      "숫자/날짜/기업명을 보존.",
      "",
      JSON.stringify(items, null, 2)
    ].join("\n");

    let summary = await geminiComplete({
      system: "당신은 한국어로 간결하게 비즈니스 뉴스를 요약하는 애널리스트입니다.",
      user,
      temperature: 0.3,
      maxOutputTokens: 800
    });

    if (!summary || summary.trim().length < 5) {
      summary = bulletsFromItems(items);
    }

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "korea"
    });
  } catch (e) {
    const summary = bulletsFromItems(items) || "• (로컬) 국내 뉴스 요약에 실패했습니다.";
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "korea",
      fallback: true,
      error: String(e?.message || e)
    });
  }
}
