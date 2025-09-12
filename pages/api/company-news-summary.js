// pages/api/company-news-summary.js
import { geminiComplete } from "../../lib/gemini";

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map((n) => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

export default async function handler(req, res) {
  const symbol = (req.query?.symbol || "").toString().trim();
  if (!symbol) {
    return res.status(400).json({ error: "symbol query is required, e.g. ?symbol=WMT" });
  }

  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  // Try to get any company-related news. If there's no per-company source, stay graceful.
  let items = [];
  try {
    // If you have a company-specific news API, replace this with that endpoint.
    // For now, reuse foreign industry list and filter by symbol presence in title.
    const r = await fetch(`${base}/api/news-foreign-industry`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const raw = Array.isArray(j?.items) ? j.items : [];
      const filtered = raw.filter((n) => {
        const t = (n?.title || "").toUpperCase();
        return t.includes(symbol.toUpperCase());
      });
      items = (filtered.length ? filtered : raw).slice(0, 10).map(n => ({
        title: n.title,
        link: n.link,
        pubDate: n.publishedAtISO || n.pubDate || null,
        source: n.source || n.sourceHost || ""
      }));
    }
  } catch (_) {}

  const fallbackSummary = bulletsFromItems(items) || `• (로컬) ${symbol} 관련 뉴스를 찾지 못했습니다.`;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: fallbackSummary,
      fallback: true
    });
  }

  try {
    const user = [
      `티커 ${symbol} 관련 기사 목록입니다. 기업 관점 핵심만 5~8줄로 한국어 요약 작성.`,
      "숫자/이벤트/날짜/지표는 유지.",
      "",
      JSON.stringify(items, null, 2)
    ].join("\n");

    let summary = await geminiComplete({
      system: "당신은 기업 뉴스의 의미를 간결히 정리하는 애널리스트입니다.",
      user,
      temperature: 0.25,
      maxOutputTokens: 800
    });

    if (!summary || summary.trim().length < 5) summary = fallbackSummary;

    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary
    });
  } catch (e) {
    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: fallbackSummary,
      fallback: true,
      error: String(e?.message || e)
    });
  }
}
