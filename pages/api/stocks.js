// /pages/api/stocks.js
// - RapidAPI Yahoo Finance get-summary 1차 시도
// - 실패/필드부족 시 get-quotes로 폴백
// - changePercent/previousClose를 최대한 산출 (빈칸 방지)
// - 에러는 상세 메시지로 내려줌 + 콘솔 로그

export default async function handler(req, res) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음 (Netlify Site settings → Env Vars 확인)" });
  }

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol 파라미터 필요" });

  // 심볼별 region 분기
  let region = "US";
  if (symbol.endsWith(".T")) region = "JP";
  else if (symbol.endsWith(".HK")) region = "HK";

  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
  };

  // fetch with timeout (8s)
  async function fetchJSON(url) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(url, { headers, signal: ac.signal });
      const text = await r.text(); // 먼저 텍스트로
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) {}
      return { ok: r.ok, status: r.status, json, text };
    } finally {
      clearTimeout(t);
    }
  }

  function buildOutput(from) {
    // from: 객체(price/summaryDetail/quote 형식이 섞일 수 있음)
    const p = from?.price || from;        // get-summary면 .price, get-quotes면 최상위 quote
    const sd = from?.summaryDetail || {}; // get-summary에서만 존재

    const price =
      p?.regularMarketPrice?.raw ??
      p?.regularMarketPrice ??
      p?.postMarketPrice?.raw ??
      p?.postMarketPrice ??
      null;

    let change =
      p?.regularMarketChange?.raw ??
      p?.regularMarketChange ??
      null;

    let previousClose =
      p?.regularMarketPreviousClose?.raw ??
      p?.regularMarketPreviousClose ??
      sd?.previousClose?.raw ??
      sd?.previousClose ??
      null;

    if (previousClose == null && price != null && change != null) {
      previousClose = Number(price) - Number(change);
    }

    let changePercent =
      p?.regularMarketChangePercent?.raw ??
      p?.regularMarketChangePercent ??
      (previousClose != null && previousClose !== 0 && price != null
        ? ((Number(price) - Number(previousClose)) / Number(previousClose)) * 100
        : null);

    if (changePercent == null && change != null && price != null && (Number(price) - Number(change)) !== 0) {
      changePercent = (Number(change) / (Number(price) - Number(change))) * 100;
    }

    const longName =
      p?.longName || p?.shortName || from?.quoteType?.longName || from?.shortName || symbol;

    const currency = p?.currency || from?.currency || null;

    return {
      symbol,
      region,
      longName,
      price: price != null ? Number(price) : null,
      currency,
      previousClose: previousClose != null ? Number(previousClose) : null,
      change: change != null ? Number(change) : (price != null && previousClose != null ? Number(price) - Number(previousClose) : null),
      changePercent: changePercent != null ? Number(changePercent) : null,
      marketCap: p?.marketCap?.fmt ?? p?.marketCap ?? null,
    };
  }

  try {
    // 1) get-summary
    const url1 = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region}`;
    const r1 = await fetchJSON(url1);

    if (r1.ok && r1.json) {
      const out = buildOutput(r1.json);
      // price가 비면 폴백 진행
      if (out.price != null) {
        return res.status(200).json(out);
      }
    } else {
      console.error("get-summary failed", symbol, r1.status, r1.text?.slice(0, 200));
      // r1.status가 401/403/429 등일 수 있음 → 즉시 폴백 시도
    }

    // 2) get-quotes (폴백)
    const url2 = `https://yh-finance.p.rapidapi.com/market/v2/get-quotes?region=${region}&symbols=${encodeURIComponent(symbol)}`;
    const r2 = await fetchJSON(url2);
    if (r2.ok && r2.json?.quoteResponse?.result?.length) {
      const q = r2.json.quoteResponse.result[0];
      const out = buildOutput(q);
      return res.status(200).json(out);
    } else {
      console.error("get-quotes failed", symbol, r2.status, r2.text?.slice(0, 200));
      return res.status(r2.status || 502).json({
        error: "Yahoo Finance API 실패 (get-summary & get-quotes)",
        symbol, region,
        status_summary: r1.status,
        status_quotes: r2.status,
        detail_summary: r1.text?.slice(0, 500) || null,
        detail_quotes: r2.text?.slice(0, 500) || null,
      });
    }
  } catch (e) {
    console.error("stocks handler error", symbol, e);
    return res.status(500).json({ error: e.message || String(e), symbol, region });
  }
}
