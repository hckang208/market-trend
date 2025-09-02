export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "symbol 파라미터 필요" });

    // 심볼별 region 분기
    let region = "US";
    if (symbol.endsWith(".T") || symbol === "9983.T") region = "JP";
    else if (symbol === "BABA" || symbol.includes(".HK")) region = "HK";

    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region}`;

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

    // 안전한 추출 + 폴백
    const p = data?.price || {};
    const sd = data?.summaryDetail || {};

    const price =
      p?.regularMarketPrice?.raw ??
      p?.postMarketPrice?.raw ??
      null;

    const previousClose =
      p?.regularMarketPreviousClose?.raw ??
      sd?.previousClose?.raw ??
      null;

    // Yahoo가 주는 퍼센트 우선 사용, 없으면 계산
    const changePercent =
      p?.regularMarketChangePercent?.raw ??
      (price != null && previousClose != null && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null);

    const change =
      price != null && previousClose != null ? price - previousClose : null;

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
      changePercent, // <-- 프론트에서 이 값 바로 사용
      marketCap: p?.marketCap?.fmt ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
