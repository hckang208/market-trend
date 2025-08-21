import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a financial analysis assistant." },
        { role: "user", content: "Give me a brief market outlook." }
      ]
    });

    res.status(200).json({ analysis: completion.choices[0].message });
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    res.status(500).json({ error: "Failed to generate analysis" });
  }
}
