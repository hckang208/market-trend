// pages/api/ai-news-foreign.js
// AI summary for 산업 → 해외뉴스. Consumes only BoF/Just-Style (via our own /api/news-foreign-industry).
// Always returns JSON.

import { geminiComplete } from "../../lib/gemini";

function pickTop(items, n=12) {
  const arr = Array.isArray(items) ? items : [];
  return arr.slice(0, n);
}

export default async function handler(req, res) {
  const nowISO = new Date().toISOString();
  try {
    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    let items = [];
    try {
      const r = await fetch(`${base}/api/news-foreign-industry?days=7&limit=40`, { cache: "no-store" });
      const txt = await r.text();
      let j = null;
      try { j = txt ? JSON.parse(txt) : null; } catch { j = null; }
      const arr = Array.isArray(j) ? j : (j?.items || []);
      items = arr.map(n => ({
        title: n.title || "",
        link: n.link || n.url || "",
        source: n.source || n.sourceHost || n.linkHost || "",
        publishedAtISO: n.publishedAtISO || n.pubDate || n.date || null
      }));
    } catch { /* ignore */ }

    // Fallback: empty items -> respond with empty summary (still JSON)
    const top = pickTop(items, 12);
    let summary = "";
    if (top.length) {
      try {
        const prompt =
`너는 패션/리테일 산업 애널리스트다.
아래 Business of Fashion / Just-Style 기사(구글 뉴스 경유)만 기반으로 핵심 인사이트 5개를 bullet로 요약해라.
기사 제목만 보고도 중복/잡음을 제거하고, 맞춤법 간결하게 정리해라.

${top.map((n,i)=>`(${i+1}) [${n.source}] ${n.title}`).join("\n")}`;
        summary = await geminiComplete(prompt, 1100);
      } catch (e) {
        summary = top.map(n => `• ${n.title} (${n.source})`).join("\n");
      }
    }

    const payload = { ok: true, generatedAt: nowISO, count: top.length, items: top, summary, scope: "overseas" };
    try { return res.status(200).json(payload); } catch { return res.end(JSON.stringify(payload)); }
  } catch (e) {
    const payload = { ok: false, generatedAt: nowISO, items: [], summary: "", error: String(e), scope: "overseas" };
    try { return res.status(200).json(payload); } catch { return res.end(JSON.stringify(payload)); }
  }
}
