import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = "오늘의 섬유/의류/패션/리테일 관련 시황을 간단히 요약해줘.";
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const summary = completion.choices[0].message.content;
    res.status(200).json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}