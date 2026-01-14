// lib/gemini.js
export async function geminiComplete({
  system = "",
  user = "",
  // 더 이상 2.0/2.0-flash로 박지 말고, 기본은 2.5-flash 추천
  model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
  temperature = 0.35,
  maxOutputTokens = 700,
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  // 공식 REST 엔드포인트 형식
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`; // :contentReference[oaicite:2]{index=2}

  // systemInstruction 는 Content 타입( role + parts )로 명확히
  const body = {
    ...(system
      ? {
          systemInstruction: {
            role: "system",
            parts: [{ text: system }],
          },
        }
      : {}),
    contents: [
      {
        role: "user",
        parts: [{ text: user }],
      },
    ],
    generationConfig: { temperature, maxOutputTokens },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // query param보다 헤더가 더 안전하게 동작하는 케이스가 많음
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });

  const raw = await r.text();
  if (!r.ok) {
    // 여기서 raw 그대로 찍히면 대부분 원인 확정 가능
    throw new Error(`Gemini error (${r.status}): ${raw}`);
  }

  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw}`);
  }

  const parts = j?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p?.text ?? "").join("").trim();

  // "응답은 왔는데 텍스트가 비어있음" 케이스를 강하게 잡아줌
  if (!text) {
    const finishReason = j?.candidates?.[0]?.finishReason;
    const safety = j?.candidates?.[0]?.safetyRatings;
    throw new Error(
      `Gemini empty response. finishReason=${finishReason ?? "unknown"} safetyRatings=${JSON.stringify(
        safety ?? null
      )} raw=${raw}`
    );
  }

  return text;
}
