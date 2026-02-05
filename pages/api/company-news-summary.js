// pages/api/company-news-summary.js
// Yahoo Finance 원본 페이지(공식 RSS 피드) → AI 요약 우선
// 1) Yahoo Finance RSS: https://feeds.finance.yahoo.com/rss/2.0/headline?s=SYMBOL&region=US&lang=en-US
// 2) 실패 시 기존 해외 산업 뉴스에서 심볼 키워드 필터 → 최종 폴백
import { geminiComplete } from "../../lib/gemini";

async function fetchText(url) {
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: {
        // 간단한 UA로 차단 완화
        "user-agent": "Mozilla/5.0 (compatible; DashboardBot/1.0)",
        "accept": "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!r.ok) return null;
    return await r.text();
  } catch (_) {
    return null;
  }
}

// 아주 심플한 RSS 파서 (Yahoo 전용 간이 파싱)
function parseYahooRss(xml) {
  if (!xml || typeof xml !== "string") return [];
  const items = [];
  const itemBlocks = xml.split(/<\/item>/i);
  for (const block of itemBlocks) {
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1]
      || block.match(/<title>(.*?)<\/title>/i)?.[1] || "").trim();
    const link = (block.match(/<link>(.*?)<\/link>/i)?.[1] || "").trim();
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || "").trim();
    const source = (block.match(/<source[^>]*>(.*?)<\/source>/i)?.[1] || "").trim();
    if (title || link) {
      items.push({ title, link, pubDate, source });
    }
  }
  // 첫 블럭은 보통 <channel> 헤더라 필터
  return items.filter(x => x.title && x.link).slice(0, 15);
}

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map(n => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

export default async function handler(req, res) {
  const symbol = (req.query?.symbol || "").toString().trim();
  if (!symbol) {
    return res.status(400).json({ error: "symbol query is required, e.g. ?symbol=WMT" });
  }

  // 1) Yahoo RSS 시도
  let items = [];
  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const xml = await fetchText(rssUrl);
  if (xml) {
    items = parseYahooRss(xml);
  }

  // 2) 폴백: 내부 해외 뉴스 중 심볼 키워드 필터 → 없으면 전체 상위 10개
  if (!items.length) {
    try {
      const proto = (req.headers["x-forwarded-proto"] || "https");
      const host = req.headers.host;
      const base = `${proto}://${host}`;
      const r = await fetch(`${base}/api/news-foreign-industry`, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        const raw = Array.isArray(j?.items) ? j.items : [];
        const filtered = raw.filter((n) => {
          const t = (n?.title || "").toUpperCase();
          return t.includes(symbol.toUpperCase());
        });
        const chosen = (filtered.length ? filtered : raw).slice(0, 10);
        items = chosen.map(n => ({
          title: n.title,
          link: n.link,
          pubDate: n.publishedAtISO || n.pubDate || null,
          source: n.source || n.sourceHost || ""
        }));
      }
    } catch (_) {}
  }

  const fallbackSummary = bulletsFromItems(items) || `• (로컬) ${symbol} 관련 뉴스를 찾지 못했습니다.`;

  // 3) 키 없으면 불릿 폴백 (항상 200)
  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: fallbackSummary,
      fallback: true,
      source: items.length ? "yahoo-or-fallback" : "fallback-only"
    });
  }

  // 3.5) 아이템이 아예 없으면(뉴스 없음) 키가 있어도 폴백 반환
  if (!items.length) {
    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: fallbackSummary,
      fallback: true,
      source: "fallback-only"
    });
  }

  // 4) 키가 있으면 요약 시도 → 실패시에도 200 + 불릿
  try {
    // 🔹 컨설팅 톤 프롬프트 적용 (기업용)
    const system =
      "한솔섬유는 주로 미국 fashion retailer에 공급하는 OEM manufacturer입니다, **컨설팅 수준**의 기업 뉴스 요약을 작성하는 시니어 전략가입니다. 한국어로 간결하고 실행가능하게 작성하세요. 과장/추정 및 투자 자문/매매 권유 금지.";

    const numbered = items.map((it, idx) => `[${idx + 1}] ${it.title}${it.source ? ` (${it.source})` : ""}`);
    const user = [
      `아래는 티커 ${symbol} 관련 최근 뉴스 ${items.length}건입니다.`,
      "",
      "출력(마크다운):",
      "### 전략 요약 (5개 불릿)",
      "- 수요/가격/재고/가이던스/밸류체인 영향 중심, 숫자·추세 포함",
      "",
      "### 당사(기업) 전략에 미치는 시사점 (3줄)",
      "",
      "### Actions (1~2주) (3개 불릿)",
      "- 구체적 실행",
      "",
      "### Risks & Assumptions (2줄)",
      "- 각 불릿/문장 끝에 관련 기사 번호를 [n] 형식으로 표기. 범위는 [2-3] 허용. 관련 기사 없으면 생략",
      "",
      "뉴스 목록:",
      ...numbered
    ].join("\n");

    let summary = await geminiComplete({
      system,
      user,
      temperature: 0.3,
      maxOutputTokens: 4096
    });

    if (!summary || summary.trim().length < 5) summary = fallbackSummary;

    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary,
      source: "yahoo-or-fallback"
    });
  } catch (e) {
    return res.status(200).json({
      symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: fallbackSummary,
      fallback: true,
      error: String(e?.message || e),
      source: "yahoo-or-fallback"
    });
  }
}
