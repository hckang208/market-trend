import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "symbol 파라미터 필요" });
    }

    const response = await fetch(
      `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "yh-finance.p.rapidapi.com"
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "API 요청 실패" });
    }

    const data = await response.json();

    res.status(200).json({
      symbol,
      longName: data.price?.longName || symbol,
      price: data.price?.regularMarketPrice?.fmt || null,
      currency: data.price?.currency || "USD",
      previousClose: data.price?.regularMarketPreviousClose?.fmt || null,
      open: data.price?.regularMarketOpen?.fmt || null,
      dayHigh: data.price?.regularMarketDayHigh?.fmt || null,
      dayLow: data.price?.regularMarketDayLow?.fmt || null,
      marketCap: data.price?.marketCap?.fmt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
