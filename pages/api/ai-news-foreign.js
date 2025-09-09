// pages/api/ai-news-foreign.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  const DOMAINS = process.env.FOREIGN_NEWS_DOMAINS || "businessoffashion.com,just-style.com";
  try {
    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const r = await fetch(`${base}/api/news?` + new URLSearchParams({
      domains: DOMAINS,
      industry: "apparel|textile|garment",
      must: "industry",
      exclude: "football,soccer,celebrity,cosmetics,beauty,automotive,film,movie",
      language: "en",
      days: String(req.query.days || 7),
      limit: String(req.query.limit || 40),
    }).toString(), { cache: "no-store" });

    const arr = r.ok ? await r.json() : [];
    const items = (arr || []).slice(0, Number(req.query.limit || 40)).map((n) => ({
      title: n.title,
      link: n.url,
      pubDate: n.published_at || n.publishedAt || null,
      source: (typeof n.source === 'string' ? n.source : (n.source && n.source.name ? n.source.name : '')) || ""
    }));

    const system = "당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 글로벌 뉴스 요약을 작성하는 시니어 전략가입니다. 한국어로 간결하고 실행가능하게 작성하세요. 과장/추정 금지.";
    const user = [
      `아래는 해외(영문) 패션/의류/가먼트/텍스타일 관련 최근 뉴스 ${items.length}건입니다.`,
      "",
      "출력(마크다운):",
      "### 전략 요약 (5개 불릿)",
      "- 수요/가격/재고/고객 변화 중심, 숫자·추세 포함",
      "",
      "### 당사 전략에 미치는 시사점 (3줄)",
      "",
      "### Actions (1~2주) (3개 불릿)",
      "- 구체적 실행",
      "",
      "### Risks & Assumptions (2줄)",
      "- 각 불릿/문장 끝에 관련 기사 번호를 [n] 형식으로 표기. 범위는 [2-3] 허용. 관련 기사 없으면 생략",
      "",
      "뉴스 목록:",
      ...items.map((it, i) => `${i+1}. ${it.title}\n   - ${it.link}`)
    ].join("\n");

    let summary = await geminiComplete({
      system,
      user,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      temperature: 0.25,
      maxOutputTokens: 900,
    });
    if (!summary || summary.trim().length < 5) {
      summary = (items || []).slice(0, 8).map((n, i) => `• ${n.title || n.source || "뉴스"} (${n.source || ""})`).join("\n");
    }
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "overseas"
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
