// pages/api/ai-summary.js
import { geminiComplete } from "../../lib/gemini";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { block = "generic", data = {}, language = "ko", mode = "brief" } = req.body || {};

  const system = `당신은 Hansoll(한솔) 부자재 구매부서의 시니어 전략 애널리스트입니다.
- 출력 언어: ${language === "ko" ? "한국어" : "English"}
- 데이터는 JSON으로 주어지며, 핵심 변화와 리스크/기회 관점을 짧고 명확하게 제시합니다.
- 과장 없이, 의사결정에 도움이 되도록 구체적인 수치(%, 추세)를 포함하세요.
- 블록 유형: ${block} (procurement | indicators | stocks | news | daily)
`;

  const user = `다음 JSON 데이터를 요약해 주세요.
요약 모드: ${mode}
요청 형식:
- 2~4개의 핵심 포인트 불릿
- 필요 시 "Risk:" / "Opportunity:" 라벨 한 줄 추가
- 한글로 간결하게

JSON:
${JSON.stringify(data, null, 2)}`;

  try {
    const summary = await geminiComplete({
      system,
      user,
      model: "gemini-1.5-flash",
      temperature: 0.35,
      maxOutputTokens: 350,
    });
    return res.status(200).json({ summary });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
