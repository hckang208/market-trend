import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "오늘의 시장 분석을 짧게 요약해줘." }],
    });

    res.status(200).json({ analysis: completion.choices[0].message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
