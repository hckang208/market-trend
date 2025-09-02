import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "오늘의 시장 동향을 요약해줘" }],
    });
    const summary = completion.choices[0].message.content;
    res.status(200).json({ success: true, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}