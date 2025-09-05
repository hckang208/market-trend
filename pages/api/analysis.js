// pages/api/analysis.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { indicators = {}, retailers = [] } = req.body || {};

    const lines = [];
    if (indicators && Object.keys(indicators).length) {
      lines.push(`• WTI: ${indicators?.wti?.latest ?? "-"} (${indicators?.wti?.date ?? ""})`);
      lines.push(`• USD/KRW: ${indicators?.usdkrw?.latest ?? "-"} (${indicators?.usdkrw?.date ?? ""})`);
      lines.push(`• US CPI: ${indicators?.cpi?.latest ?? "-"} (${indicators?.cpi?.date ?? ""})`);
    }
    for (const r of retailers) {
      const changePct = (r?.stock?.price != null && r?.stock?.previousClose != null)
        ? (((r.stock.price - r.stock.previousClose) / r.stock.previousClose) * 100).toFixed(2) + "%"
        : null;
      lines.push(`• ${r?.stock?.longName || r?.symbol}: ${r?.stock?.price ?? "-"} ${r?.stock?.currency ?? ""}${changePct ? " (" + changePct + ")" : ""}`);
      if (Array.isArray(r?.news)) {
        for (const n of r.news.slice(0, 2)) {
          lines.push(`   - ${n.title || ""} | ${n.url || ""}`);
        }
      }
    }

    const prompt = [
      "아래의 거시지표, 환율, CPI, 그리고 주요 리테일러 주가/헤드라인을 검토하고,",
      "실무진 보고서 수준의 요약 인사이트를 한국어로 작성하세요.",
      "형식:",
      "1) 핵심 요약 5개 불릿",
      "2) 리스크 2개 · 기회 2개",
      "3) 향후 1~2주 액션아이템 3개 (데이터 드리븐)",
      "가능한 한 간결하게 숫자를 포함해서 작성. 불필요한 수사는 금지.",
      "",
      "=== 자료 ===",
      lines.join("\n")
    ].join("\n");

    const out = await geminiComplete({
      system: "You are a senior strategy consultant writing **BCG-level**, executive-ready Korean briefs for Hansoll Textile's strategy leadership.",
      user: prompt,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      temperature: 0.2,
      maxOutputTokens: 1200,
    });

    return res.status(200).json({ summary: out });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
