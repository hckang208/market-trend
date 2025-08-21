import OpenAI from "openai";

export default async function handler(req, res) {
  console.log("🤖 analysis.js API 호출!!");

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt가 필요합니다." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    res.status(200).json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error("❌ analysis.js 에러:", error);
    res.status(500).json({ error: "분석 요청에 실패했습니다." });
  }
}
