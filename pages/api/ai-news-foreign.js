// pages/api/ai-news-foreign.js
import { geminiComplete } from "../../lib/gemini";

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map((n) => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

export default async function handler(req, res) {
  // Build base URL to call internal routes (works on Vercel/Netlify/Node)
  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  let items = [];
  try {
    const r = await fetch(`${base}/api/news-foreign-industry`, { cache: "no-store" });
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

  // If no API key or quota exhausted, return a graceful fallback (HTTP 200)
  if (!process.env.GEMINI_API_KEY) {
    const summary = bulletsFromItems(items);
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary: summary || "• (로컬) 해외 산업 뉴스가 부족합니다.",
      scope: "foreign",
      fallback: true
    });
  }

  try {
    const user = [
      "아래 해외 패션/리테일 산업 관련 기사 제목과 출처를 간단 불릿으로 핵심만 요약해줘.",
      "숫자/날짜/회사명은 보존하고, 5~8줄로 압축.",
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
      scope: "foreign"
    });
  } catch (e) {
    const summary = bulletsFromItems(items) || "• (로컬) 해외 산업 뉴스 요약에 실패했습니다.";
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "foreign",
      fallback: true,
      error: String(e?.message || e)
    });
  }
}
