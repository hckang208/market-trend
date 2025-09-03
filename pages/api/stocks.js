// /pages/api/stocks.js
export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "symbol 파라미터 필요" });

    // 심볼별 region 간단 분기
    let region = "US";
    if (symbol.endsWith(".T")) region = "JP";
    if (symbol.endsWith(".HK")) region = "HK";

    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(
      symbol
    )}&region=${region}`;

    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({
        error: "Yahoo Finance API 실패",
        detail: text,
        symbol,
        region,
      });
    }

    const data = await r.json();
    const p = data?.price || {};
    const sd = data?.summaryDetail || {};

    // 현재가
    const price =
      p?.regularMarketPrice?.raw ??
      p?.postMarketPrice?.raw ??
      null;

    // 절대값 change
    let change =
      p?.regularMarketChange?.raw ??
      null;

    // 이전 종가 (없으면 price - change 로 보정)
    let previousClose =
      p?.regularMarketPreviousClose?.raw ??
      sd?.previousClose?.raw ??
      null;

    if (previousClose == null && price != null && change != null) {
      previousClose = price - change;
    }

    // 퍼센트: API 값 우선 → 없으면 연산
    let changePercent =
      p?.regularMarketChangePercent?.raw ??
      (previousClose != null && previousClose !== 0 && price != null
        ? ((price - previousClose) / previousClose) * 100
        : null);

    if (changePercent == null && change != null && price != null && price !== change) {
      // previousClose 미확정이어도 change/price 로 보정
      changePercent = (change / (price - change)) * 100;
    }

    if (change == null && price != null && previousClose != null) {
      change = price - previousClose;
    }

    const longName =
      p?.longName || p?.shortName || data?.quoteType?.longName || symbol;

    res.status(200).json({
      symbol,
      region,
      longName,
      price,
      currency: p?.currency || null,
      previousClose,
      change,
      changePercent, // 프론트에서 우선 사용
      marketCap: p?.marketCap?.fmt ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
