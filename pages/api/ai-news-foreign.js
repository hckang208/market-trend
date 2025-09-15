// pages/api/ai-news-foreign.js
import { geminiComplete } from "../../lib/gemini";

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map((n) => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

export default async function handler(req, res) {
  // 내부 API 호출용 base URL (Netlify/Vercel 호환)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  let items = [];
  try {
    const r = await fetch(`${base}/api/news-foreign-industry`, { cache: "no-store" });
    const j = r.ok ? await r.json() : { items: [] };
    items = (j?.items || []).slice(0, 10).map((n) => ({
      title: n.title,
      link: n.link,
      pubDate: n.publishedAtISO || n.pubDate || null,
      source: n.source || n.sourceHost || ""
    }));
  } catch (_) {
    items = [];
  }

  // API 키 없거나 쿼터 소진 시 graceful fallback
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
    // 🔹 여기서 프롬프트 교체
    const system =
      "당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 글로벌 뉴스 요약을 작성하는 시니어 전략가입니다. 한국어로 간결하고 실행가능하게 작성하세요. 과장/추정 금지.";

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
      ...items.map((it, idx) => `[${idx + 1}] ${it.title} (${it.source})`)
    ].join("\n");

    let summary = await geminiComplete({
      system,
      user,
      temperature: 0.3,
      maxOutputTokens: 1200
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
