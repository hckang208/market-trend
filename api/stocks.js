export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음 (Vercel Settings 확인 필요)" });
    }

    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "symbol 파라미터 필요" });
    }

    // 심볼별 region 자동 분기
    let region = "US";
    if (symbol.endsWith(".T")) region = "JP";   // 일본 (Fast Retailing)
    else if (symbol === "BABA") region = "HK";  // 알리바바 → 홍콩
    else if (symbol.includes(".HK")) region = "HK";
    else if (symbol === "9983.T") region = "JP"; // 유니클로

    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(
      symbol
    )}&region=${region}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Yahoo API Error:", symbol, r.status, text);
      return res.status(r.status).json({
        error: "Yahoo Finance API 호출 실패",
        symbol,
        region,
        detail: text,
      });
    }

    const data = await r.json();

    res.status(200).json({
      symbol,
      region,
      longName: data?.quoteType?.longName || symbol,
      price: data?.price?.regularMarketPrice?.raw || null,
      currency: data?.price?.currency || null,
      previousClose: data?.price?.regularMarketPreviousClose?.raw || null,
      open: data?.price?.regularMarketOpen?.raw || null,
      dayHigh: data?.price?.regularMarketDayHigh?.raw || null,
      dayLow: data?.price?.regularMarketDayLow?.raw || null,
      marketCap: data?.price?.marketCap?.fmt || null,
    });
  } catch (err) {
    console.error("API stocks handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
