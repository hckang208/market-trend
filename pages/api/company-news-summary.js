// pages/api/company-news-summary.js
import { geminiComplete } from "../../lib/gemini";

function parseSimpleRss(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const text = (tag) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, "i").exec(block);
      return r ? r[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() : null;
    };
    items.push({
      title: text("title"),
      link: text("link"),
      pubDate: text("pubDate"),
      description: text("description"),
      source: "Yahoo Finance RSS",
    });
  }
  return items;
}

async function fetchYahooRss(symbol) {
  const urls = [
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&lang=en-US&region=US`,
    `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(symbol)}`
  ];
  for (const u of urls) {
    const r = await fetch(u);
    if (r.ok) {
      const xml = await r.text();
      const items = parseSimpleRss(xml);
      if (Array.isArray(items) && items.length) return items;
    }
  }
  return [];
}

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    const lang = (req.query.lang || "ko").toLowerCase();
    const days = Number(req.query.days || 7);
    const limit = Number(req.query.limit || 10);

    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    // 1) symbol -> company name
    const stockRes = await fetch(`${base}/api/stocks?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    const stockJson = stockRes.ok ? await stockRes.json() : {};
    const companyName = stockJson.longName || stockJson.name || symbol;

    // 2) Yahoo RSS, fallback to /api/news
    let rawItems = await fetchYahooRss(symbol);

    if (!rawItems.length) {
      const newsURL = `${base}/api/news?` + new URLSearchParams({
        brand: companyName,
        language: "en",
        days: String(days),
        limit: String(limit * 2)
      }).toString();
      const r = await fetch(newsURL, { cache: "no-store" });
      if (r.ok) {
        const arr = await r.json();
        rawItems = (arr || []).map(n => ({
          title: n.title,
          link: n.url,
          pubDate: n.published_at || n.publishedAt || null,
          description: n.description || n.summary || "",
          source: (typeof n.source === 'string' ? n.source : (n.source && n.source.name ? n.source.name : '')) || ""
        }));
      }
    }

    const items = (rawItems || [])
      .filter(x => x && x.title && x.link)
      .slice(0, limit)
      .map(it => ({
        ...it,
        snippet: (it.description || "").replace(/\s+/g, " ").slice(0, 300)
      }));

    const system = lang === "ko"
      ? `당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 요약을 작성하는 시니어 전략가입니다.
- 사실 기반으로만 작성하고, 과장/추정/할루시네이션을 금지합니다.
- 한국어로 명확하게 보고서 톤으로 작성합니다.
- 목적: 최근 뉴스 ${items.length}건을 바탕으로 '당사 전략수립에 참조할만한 내용'만 골라 정리.`
      : `You are a senior strategist at Hansoll Textile. Provide concise, factual strategy-focused summary in English using the latest ${items.length} news items.`;

    const user = [
      `${companyName} (${symbol}) 관련 최근 ${items.length}건 뉴스입니다. 각 제목/스니펫/링크를 참고해, 당사의 전략 수립 관점에서 핵심만 요약해 주세요.`,
      "",
      "출력 형식(마크다운):",
      "### 전략 요약 (5개 불릿)",
      "- 시장/수요/가격/고객 변화 중심으로 숫자·트렌드 포함",
      "",
      "### 당사 전략에 미치는 시사점 (3줄)",
      "- 공급망/원가/고객사 영향 등",
      "",
      "### Actions (1~2주) (3개 불릿)",
      "- 실행 가능한 액션을 간결하게",
      "",
      "### Risks & Assumptions (2줄)\n- 각 불릿/문장 끝에 관련 기사 번호를 대괄호로 표기하세요. 예: [1], [2-3]. 관련 기사 없으면 생략",
      "- 리스크와 전제 명시",
      "",
      "뉴스 목록:",
      ...items.map((it, i) => `${i + 1}. ${it.title}\n   - ${it.snippet}\n   - ${it.link}`)
    ].join("\n");

    const summary = await geminiComplete({
      system,
      user,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      temperature: 0.25,
      maxOutputTokens: 900,
    });

    return res.status(200).json({
      symbol,
      companyName,
      count: items.length,
      items: items.map(({ snippet, ...rest }) => rest),
      summary,
      generatedAt: new Date().toISOString(),
      source: items[0]?.source || "Yahoo/News"
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
