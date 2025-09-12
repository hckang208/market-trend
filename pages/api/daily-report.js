// pages/api/daily-report.js
import { geminiComplete } from "../../lib/gemini";

function joinNonEmpty(parts, sep = "\n\n") {
  return parts.filter(Boolean).join(sep);
}

export default async function handler(req, res) {
  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  // Try to assemble minimal context, but tolerate failures
  let foreign = null, korea = null, indicators = null;
  try { const r = await fetch(`${base}/api/news-foreign-industry`, { cache: "no-store" }); foreign = r.ok ? await r.json() : null; } catch {}
  try { const r = await fetch(`${base}/api/news-kr-daily`, { cache: "no-store" }); korea = r.ok ? await r.json() : null; } catch {}
  try { const r = await fetch(`${base}/api/indicators`, { cache: "no-store" }); indicators = r.ok ? await r.json() : null; } catch {}

  const local = joinNonEmpty([
    "## Daily Report (로컬 폴백)",
    indicators ? `### 지표 스냅샷\n- keys: ${Object.keys(indicators).slice(0,6).join(", ")}` : "### 지표 스냅샷\n- (데이터 없음)",
    foreign ? `### 해외 뉴스 ${foreign?.items?.length ?? 0}건` : "### 해외 뉴스 0건",
    korea ? `### 국내 뉴스 ${korea?.items?.length ?? 0}건` : "### 국내 뉴스 0건",
    "### Actions\n- API 키/쿼터 설정 후 AI 리포트 활성화\n- 실패 시에도 화면은 비지 않도록 폴백 유지"
  ]);

  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      summary: local,
      content: local,
      report: local,
      fallback: true,
      generatedAt: new Date().toISOString()
    });
  }

  try {
    const user = [
      "다음은 오늘의 지표/뉴스 요약 재료입니다. 한국어로 8~12줄 핵심 리포트를 작성하세요.",
      "",
      JSON.stringify({ indicators, foreign, korea }, null, 2)
    ].join("\n");

    let summary = await geminiComplete({
      system: "당신은 한국어로 간결한 일간 리포트를 작성하는 분석가입니다.",
      user,
      temperature: 0.25,
      maxOutputTokens: 1100
    });

    if (!summary || summary.trim().length < 5) summary = local;

    return res.status(200).json({
      summary,
      content: summary,
      report: summary,
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    return res.status(200).json({
      summary: local,
      content: local,
      report: local,
      fallback: true,
      error: String(e?.message || e),
      generatedAt: new Date().toISOString()
    });
  }
}
