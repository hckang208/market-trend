// pages/api/ai-summary.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { block = "generic", data = {}, language = "ko", mode = "brief" } = req.body || {};

  const system = `당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 인사이트를 작성하는 시니어 전략 애널리스트입니다.
- 출력 언어: ${language === "ko" ? "한국어" : "English"}
- 데이터는 JSON으로 주어지며, 과장 없이 의사결정에 도움이 되도록 핵심 변화와 리스크/기회를 간결하게 제시합니다.
- 가능하면 구체 수치(%, 추세)를 포함하세요.
- 블록 유형: ${block} (procurement | indicators | stocks | news | daily | generic)
- 모드: ${mode} (brief | normal)
`;

  const user = `다음 JSON 데이터를 요약하세요.
요구사항:
1) 불필요한 수식어 제거, 실무진 보고용 핵심 bullet.
2) ${block === "daily" ? "‘오늘의 3가지 핵심’ → ‘해외 vs 국내 요약’ → ‘리테일러 주가’ → ‘Risk/Action’" : "핵심 요점 → 수치 변화 → 영향/리스크 → 액션 제안"} 순서.
3) 너무 길지 않게(1~2분 내 읽기).

JSON:
${safeStringify(data)}`;

  // ✅ 키가 없거나 호출이 실패해도 200 + 로컬 요약으로 우회
  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({ summary: localFallback(block, data, language) });
  }

  try {
    const summary = await geminiComplete({
      system,
      user,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      temperature: 0.35,
      maxOutputTokens: 450,
    });
    return res.status(200).json({ summary });
  } catch (e) {
    // 실패 시에도 200으로 기본 요약 반환
    return res.status(200).json({ summary: localFallback(block, data, language) });
  }
}

/* ---------------------------
   Helpers
--------------------------- */
function safeStringify(v) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function num(n) {
  const v = Number(n);
  return isFinite(v) ? v.toLocaleString() : "-";
}
function pct(n, d=1) {
  const v = Number(n);
  if (!isFinite(v)) return "-";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(d)}%`;
}

function t(ko, en, lang) { return lang === "ko" ? ko : en; }

function localFallback(block, data = {}, lang = "ko") {
  try {
    if (block === "procurement") {
      const c = data.current || data || {};
      const sb = c.supplyBreakdown || {};
      const lines = [];
      if (c.revenue) lines.push(t(`• 매출: ${num(c.revenue)} ${data.currency || ""}`, `• Revenue: ${num(c.revenue)} ${data.currency || ""}`, lang));
      if (c.materialSpend) lines.push(t(`• 부자재: ${num(c.materialSpend)} ${data.currency || ""}`, `• Materials: ${num(c.materialSpend)} ${data.currency || ""}`, lang));
      if (c.styles) lines.push(t(`• 오더: ${num(c.styles)}건`, `• Styles: ${num(c.styles)}`, lang));
      if (c.poCount) lines.push(t(`• PO: ${num(c.poCount)}건`, `• POs: ${num(c.poCount)}`, lang));
      if (sb.domestic || sb.thirdCountry || sb.local) {
        lines.push(
          t(
            `• 공급비중: 국내 ${sb.domestic ?? "-"}% · 3국 ${sb.thirdCountry ?? "-"}% · 현지 ${sb.local ?? "-"}%`,
            `• Mix: Domestic ${sb.domestic ?? "-"}% · 3rd ${sb.thirdCountry ?? "-"}% · Local ${sb.local ?? "-"}%`,
            lang
          )
        );
      }
      const y = data.yoy || {};
      const yoyPairs = Object.entries(y).filter(([,v]) => v !== null && isFinite(v));
      if (yoyPairs.length) {
        const ups = yoyPairs.filter(([,v]) => v > 0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`${k} ${pct(v)}`);
        const downs = yoyPairs.filter(([,v]) => v < 0).sort((a,b)=>a[1]-b[1]).slice(0,2).map(([k,v])=>`${k} ${pct(v)}`);
        if (ups.length) lines.push(t(`• 상승: ${ups.join(", ")}`, `• Up: ${ups.join(", ")}`, lang));
        if (downs.length) lines.push(t(`• 하락: ${downs.join(", ")}`, `• Down: ${downs.join(", ")}`, lang));
      }
      lines.push(t(`• 액션: 가격/환율 민감 품목 점검, 핵심 공급처 리스크 리뷰`, `• Action: Review price/FX-sensitive items; reassess key suppliers' risks`, lang));
      return lines.join("\n");
    }

    if (block === "indicators") {
      const i = data || {};
      const lines = [];
      if (i.fxKRW) lines.push(t(`• 환율(KRW/USD): ${num(i.fxKRW)}`, `• FX (KRW/USD): ${num(i.fxKRW)}`, lang));
      if (i.cotton) lines.push(t(`• 면화(¢/lb): ${num(i.cotton)}`, `• Cotton (¢/lb): ${num(i.cotton)}`, lang));
      if (i.freight) lines.push(t(`• 해상운임: ${num(i.freight)}`, `• Ocean freight: ${num(i.freight)}`, lang));
      lines.push(t(`• 액션: 원가 민감지표 변동성 감시`, `• Action: Watch cost-sensitive indicators`, lang));
      return lines.join("\n");
    }

    if (block === "stocks") {
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const top = rows.slice(0,5).map(r => `${r.symbol || r.name}: ${pct(r.pct ?? 0, 2)}`).join(", ");
      return t(`• 주가: ${top}\n• 액션: 변동폭 큰 종목 관련 공급망 이슈 체크`, `• Stocks: ${top}\n• Action: Check supply-chain exposure on high-vol names`, lang);
    }

    if (block === "news") {
      const n = Array.isArray(data.items) ? data.items : [];
      const titles = n.slice(0,5).map(x => `- ${x.title || x.headline || ""}`).join("\n");
      return t(`• 주요 뉴스(Top5)\n${titles}`, `• Top 5 Headlines\n${titles}`, lang);
    }

    if (block === "daily") {
      // 간단한 일일 브리프 포맷
      const lines = [];
      lines.push(t("### 오늘의 3가지 핵심", "### Top 3 Today", lang));
      lines.push(t("- 거시/원가 지표 변동 체크\n- 해외·국내 뉴스에서 산업 영향 포인트 선별\n- 주요 리테일러 주가 변동 감시",
                   "- Watch macro/cost indicators\n- Filter industry-impact points from news\n- Monitor major retailers' moves", lang));
      lines.push("");
      lines.push(t("### Risk / Action", "### Risk / Action", lang));
      lines.push(t("- 환율/면화/운임 급등락 시 단가/발주 일정 재점검",
                   "- Recheck pricing/PO schedule under FX/Cotton/Freight swings", lang));
      return lines.join("\n");
    }

    // generic
    const keys = Object.keys(data || {});
    return t(`• 입력 데이터 요약 가능. 주요 키: ${keys.slice(0,6).join(", ")}`, `• Data received. Keys: ${keys.slice(0,6).join(", ")}`, lang);
  } catch {
    return t("• 간단 요약 생성 실패", "• Fallback summary failed", lang);
  }
}
