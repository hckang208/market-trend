// pages/api/ai-news-korea.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  try {
    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const r = await fetch(`${base}/api/news-kr-rss?` + new URLSearchParams({
      feeds: "http://www.ktnews.com/rss/allArticle.xml",
      days: String(req.query.days || 1),
      limit: String(req.query.limit || 200),
    }).toString(), { cache: "no-store" });

    const arr = r.ok ? await r.json() : [];
    const items = (arr || []).slice(0, Number(req.query.limit || 60)).map((n) => ({
      title: n.title,
      link: n.url,
      pubDate: n.published_at || n.publishedAt || null,
      source: (typeof n.source === 'string' ? n.source : (n.source && n.source.name ? n.source.name : '')) || ""
    }));

    const system = "당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 국내 뉴스 요약을 작성하는 시니어 전략가입니다. 한국어로 간결하고 실행가능하게 작성하세요. 과장/추정 금지.";
    const user = [
      `아래는 한국섬유신문 RSS 기반 국내 뉴스 최근 ${items.length}건입니다 (일간).`,
      "",
      "출력(마크다운):",
      "### 전략 요약 (5개 불릿)",
      "- 내수/수출/원가/정책 변화 중심, 숫자·추세 포함",
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
      scope: "korea"
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
