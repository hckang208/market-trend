// pages/api/analysis.js
import { geminiComplete } from "../../lib/gemini";

async function safeGetJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return null;
    return await r.json();
  } catch (_) {
    return null;
  }
}

function briefFromData({ indicators, retailers }) {
  const lines = [];
  if (indicators) {
    const keys = Object.keys(indicators).slice(0, 6);
    if (keys.length) {
      lines.push("**주요 지표(샘플)**");
      for (const k of keys) {
        const v = indicators[k];
        lines.push(`- ${k}: ${typeof v === "number" ? v.toLocaleString() : String(v)}`);
      }
    }
  }
  if (retailers && Array.isArray(retailers) && retailers.length) {
    lines.push("");
    lines.push("**리테일러(샘플)**");
    for (const r of retailers.slice(0, 6)) {
      const name = r?.name || r?.symbol || "Retailer";
      const chg = (r?.changePct != null) ? `${(Number(r.changePct) >= 0 ? "+" : "")}${Number(r.changePct).toFixed(2)}%` : "-";
      lines.push(`- ${name}: ${chg}`);
    }
  }
  return lines.join("\n");
}

export default async function handler(req, res) {
  const proto = (req.headers["x-forwarded-proto"] || "https");
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  // Try to collect a tiny bit of context for the fallback
  const indicators = await safeGetJSON(`${base}/api/indicators`);
  // Optional: if you have a retailers endpoint, plug it here. Otherwise keep it null.
  const retailers = null;

  const localBrief = [
    "### 핵심 요약(로컬)",
    briefFromData({ indicators, retailers }) || "- 지표/데이터를 불러오지 못했습니다.",
    "",
    "### Risks",
    "- 키 없음/쿼터 소진 또는 모델 호출 실패 가능성.",
    "",
    "### Actions (1~2주)",
    "- API 키/쿼터 설정, 데이터 정상화 후 상세 분석 재실행."
  ].join("\n");

  // No key → return graceful fallback (HTTP 200)
  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({ summary: localBrief, fallback: true, generatedAt: new Date().toISOString() });
  }

  try {
    const user = [
      "다음은 시장 지표 및 리테일러 간단 샘플입니다. 한국어로 5~8줄 핵심 요약과 3~5개 실행 액션을 제시하세요.",
      "",
      JSON.stringify({ indicators, retailers }, null, 2)
    ].join("\n");

    let summary = await geminiComplete({
      system: "당신은 공급망/리테일 관점에서 간결하게 실행 가능한 인사이트를 제시하는 분석가입니다.",
      user,
      temperature: 0.2,
      maxOutputTokens: 900
    });

    if (!summary || summary.trim().length < 5) {
      summary = localBrief;
    }

    return res.status(200).json({ summary, generatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(200).json({
      summary: localBrief,
      fallback: true,
      error: String(e?.message || e),
      generatedAt: new Date().toISOString()
    });
  }
}
