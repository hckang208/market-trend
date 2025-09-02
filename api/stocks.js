import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // 기본값은 Walmart(WMT), 쿼리스트링으로 심볼 변경 가능
    const symbol = req.query.symbol || "WMT"; 
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "환경변수 RAPIDAPI_KEY가 설정되지 않았습니다. Vercel Dashboard → Settings → Environment Variables 에서 추가하세요."
      });
    }

    // Yahoo Finance (RapidAPI) endpoint
    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com"
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 필요한 정보만 추려서 반환 (주가, 통화, 시가총액 등)
    const result = {
      symbol: symbol,
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
    res.status(500).json({ error: error.message });
  }
}
