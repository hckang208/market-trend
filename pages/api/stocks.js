export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });

    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "symbol 파라미터 필요" });

    let region = "US";
    if (symbol.endsWith(".T")) region = "JP";
    else if (symbol === "BABA") region = "HK";
    else if (symbol.includes(".HK")) region = "HK";
    else if (symbol === "9983.T") region = "JP";

    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region}`;

    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com"
      }
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "Yahoo Finance API 실패", detail: t, symbol, region });
    }
    const data = await r.json();
    res.status(200).json({
      symbol,
      region,
      longName: data?.quoteType?.longName || symbol,
      price: data?.price?.regularMarketPrice?.raw || null,
      currency: data?.price?.currency || null,
      previousClose: data?.price?.regularMarketPreviousClose?.raw || null,
      marketCap: data?.price?.marketCap?.fmt || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
