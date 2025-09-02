export default async function handler(req, res) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "환경변수 OPENAI_API_KEY 없음" });
    const { items } = await req.json().catch(() => ({ items: [] }));
    const text = (items || []).map((n, i) => `(${i+1}) ${n.title || ''} - ${n.url || ''}`).join("\n");

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Condense the retail news items into 5 bullet insights. Be concise." },
          { role: "user", content: text || "No items" }
        ]
      })
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "OpenAI 호출 실패", detail: t });
    }
    const j = await r.json();
    const out = j?.choices?.[0]?.message?.content || "";
    res.status(200).json({ summary: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
