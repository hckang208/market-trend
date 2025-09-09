import sanitizeHtml from "sanitize-html";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { items = [], tone = "concise" } = req.body || {};
    const key = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    let summary = "";

    const fallbackFromItems = (list=[]) => {
      if (!list.length) {
        return [
          "<h3>요약</h3>",
          "<p>최근 수집된 뉴스가 충분하지 않습니다. 환경변수(GEMINI_API_KEY)를 설정하면 AI 요약이 더 정교해집니다.</p>",
          "<ul>",
          "<li>예시: 면화·유가 변동성 확대 → 원가 압력 유의</li>",
          "<li>예시: 주요 리테일러 재고 정상화 진행</li>",
          "<li>예시: USD/KRW 강세 시 수입단가 상방 위험</li>",
          "</ul>",
        ].join("\n");
      }
      const top = list.slice(0, 8);
      const bullets = top
        .map((a, i) => `<li>${i+1}. ${escapeHtml((a.title || "")).replace(/\s+/g," ").trim()}</li>`)
        .join("\n");
      return [
        "<h3>핵심 뉴스 포인트</h3>",
        "<ul>",
        bullets,
        "</ul>",
        "<h4>암시되는 영향</h4>",
        "<ul>",
        "<li>원자재/환율 변동성 → 매입단가 방어 필요</li>",
        "<li>리드타임·소싱 다변화 검토</li>",
        "<li>핵심 SKU 중심 재고/오더 최적화</li>",
        "</ul>",
      ].join("\n");
    };

    function escapeHtml(str="") {
      return str
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    }

    if (key) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName });

        const lines = (items || []).slice(0, 12).map((a, i) => `- (${i+1}) ${a.title ?? ""}`);
        const prompt = [
          "당신은 '구매/소싱' 관점의 애널리스트입니다.",
          "아래 헤드라인을 5~7개의 불릿으로 요약하고, '영향/리스크'와 '추천 액션'을 간결히 제시하세요.",
          "금칙어: 임원, 전략기획, 전략기획부 (이 단어들은 사용하지 마세요).",
          "",
          "헤드라인:",
          ...lines,
          "",
          tone === "deep"
            ? "톤: 간결하지만 인사이트 중심. 수치·추세·영향을 분리 표기."
            : "톤: 간결. 불릿 위주.",
          "",
          "출력 형식(HTML 허용):",
          "<h3>요약</h3>",
          "<ul><li>...</li></ul>",
          "<h4>영향/리스크</h4>",
          "<ul><li>...</li></ul>",
          "<h4>추천 액션</h4>",
          "<ul><li>...</li></ul>",
        ].join("\n");

        const result = await model.generateContent(prompt);
        const text = (await result.response.text())?.trim();
        summary = text || fallbackFromItems(items);
      } catch (err) {
        summary = fallbackFromItems(items);
      }
    } else {
      summary = fallbackFromItems(items);
    }

    const clean = sanitizeHtml(summary, {
      allowedTags: ["b","strong","em","br","ul","ol","li","p","h2","h3","h4"],
      allowedAttributes: {}
    });

    res.status(200).json({ summary: clean, generatedAt: new Date().toISOString(), modelUsed: key ? modelName : "fallback" });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
