import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol || "WMT";
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "환경변수 RAPIDAPI_KEY가 설정되지 않았습니다.",
        symbol
      });
    }

    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com"
      }
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      return res.status(500).json({ error: "백엔드 JSON 파싱 실패", symbol });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || `Yahoo Finance API 요청 실패 (${response.status})`,
        symbol
      });
    }

    // 정상일 경우 필요한 데이터 추출
    const result = {
      symbol,
      price: data.price?.regularMarketPrice?.raw || null,
      currency: data.price?.currency || null,
      marketCap: data.price?.marketCap?.fmt || null,
      shortName: data.price?.shortName || null,
      longName: data.price?.longName || null,
      previousClose: data.price?.regularMarketPreviousClose?.fmt || null,
      open: data.price?.regularMarketOpen?.fmt || null,
      dayHigh: data.price?.regularMarketDayHigh?.fmt || null,
      dayLow: data.price?.regularMarketDayLow?.fmt || null
    };

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: error.message, symbol: req.query.symbol || "WMT" });
  }
}
