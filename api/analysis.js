import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    너는 섬유 / 패션 / 리테일 산업 전문가야.
    오늘의 주가, 경제지표, 뉴스 흐름을 종합해서
    한솔섬유 구매팀이 참고할 만한 5줄 요약 시황 보고서를 써줘.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    res.status(200).json({ text: completion.choices[0].message.content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Analysis API error" });
  }
}
