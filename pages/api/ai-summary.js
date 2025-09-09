import sanitizeHtml from "sanitize-html";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { items = [], tone = "concise" } = req.body || {};
    const key = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    let summary = "";

    if (key) {
      try {
        const { GoogleGenerativeAI } = await import("google-generative-ai");
        const genAI = new GoogleGenerativeAI(key);
        const m = genAI.getGenerativeModel({ model });
        const prompt = [
          "당신은 패션/의류/소싱 산업 전문 애널리스트입니다.",
          "항상 한국어로 bullet 중심의 간결요약을 만듭니다.",
          "절대 '전략기획부', '임원' 단어를 쓰지 마세요.",
          "섹션: ① 한줄요약 ② 핵심 이슈 ③ 영향/리스크 ④ 추천 액션",
          "",
          "기사 목록:",
          ...items.slice(0, 12).map((it, i) => `${i+1}. ${it.title} — ${it.source || ""}
   ${it.link || ""}`)
        ].join("\n");

        const r = await m.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }]}],
          generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
        });
        summary = (r?.response?.text?.() || "").trim();
      } catch (e) {
        summary = "";
      }
    }

    if (!summary) {
      // Fallback mock
      summary = [
        "## 한줄요약",
        "- 최근 원자재/환율/소비 둔화가 혼재. 소싱 다변화 및 재고관리 중요.",
        "## 핵심 이슈",
        "- WTI/면화가 변동성 확대, USD/KRW 강세 유지 가능성.",
        "## 영향/리스크",
        "- 매입단가 상승 압력, 마진 방어 필요.",
        "## 추천 액션",
        "- ① 계약단가 재협상 ② 리드타임 분산 ③ 스타일 축소 및 핵심 SKU 집중"
      ].join("\n");
    }

    const clean = sanitizeHtml(summary, { allowedTags: ["b","strong","i","em","u","br","ul","ol","li","p","h2","h3","h4"], allowedAttributes: {} });
    res.status(200).json({ summary: clean, generatedAt: new Date().toISOString(), modelUsed: model });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
