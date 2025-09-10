// lib/gemini.js
export async function geminiComplete({
  system = "",
  user = "",
  model = process.env.GEMINI_MODEL || "gemini-2.0-flash",
  temperature = 0.35,
  maxOutputTokens = 700,
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ parts: [{ text: user }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Gemini error: ${txt}`);
  }

  const j = await r.json();
  const parts = j?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || "").join("").trim();
}
