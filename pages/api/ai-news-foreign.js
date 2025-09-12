// pages/api/ai-news-foreign.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  try {
    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    // 해외 뉴스는 캐시된 daily 소스에서 그대로 받아 요약 (키워드 필터 제거)
    const r = await fetch(`${base}/api/news-foreign-industry?days=7&limit=30`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "해외 뉴스 로드 실패");

    const items = ((j?.items || j || [])).slice(0, 12).map(n => ({
      title: n.title || "",
      link: n.link || n.url || "",
      source: n.source || n.sourceHost || n.linkHost || ""
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

    let summary = await geminiComplete({ system, user });
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
