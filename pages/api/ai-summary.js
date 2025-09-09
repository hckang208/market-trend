export const config = { runtime: 'nodejs' };

/**
 * Minimal placeholder summarizer to avoid 404/500 when GEMINI is not wired.
 * It concatenates titles and returns bullet points.
 * You can later replace with real Gemini/OpenAI call.
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { block, language = "ko", mode = "brief", data = {} } = await req.json?.() || req.body || {};
    const items = Array.isArray(data?.items) ? data.items : [];
    const head = (block ? `### ${block} 요약` : "### 요약");
    const lines = items.slice(0, 12).map((it, i) => `- ${it.title || it.url || "항목"}${it.url ? ` [${i+1}]` : ""}`);
    const summary = [head, "", ...lines].join("\n");
    return res.status(200).json({ summary, items, generatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(200).json({ summary: "(요약 생성 실패 또는 미구현)", error: String(e?.message || e) });
  }
}
