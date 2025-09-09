export const config = { runtime: 'nodejs' };

/**
 * Placeholder summarizer that returns bullet points ONLY (no headings like "### block").
 * Replace with real Gemini/OpenAI call later if needed.
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    let payload = {};
    try {
      // Next.js API on Netlify may not support req.json()
      payload = (await req.json?.()) || req.body || {};
    } catch {
      payload = req.body || {};
    }
    const { data = {} } = payload;
    const items = Array.isArray(data?.items) ? data.items : [];
    const lines = items.slice(0, 12).map((it, i) => `• ${it.title || it.url || "항목"}`);
    const summary = (lines.length ? lines.join("\n") : "요약할 항목이 없습니다.");
    return res.status(200).json({ summary, generatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(200).json({ summary: "요약 생성 실패", error: String(e?.message || e) });
  }
}
