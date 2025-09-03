// pages/api/stocks.js
// 표준 응답: { symbol, longName, price, previousClose, change, changePercent }
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || "").trim();
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    const region = symbol.endsWith(".T") ? "JP" : "US";
    const RAPID = process.env.RAPIDAPI_KEY;

    const COMMON_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    };

    const withTimeout = async (fn, ms = 6000) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort("timeout"), ms);
      try { return await fn(ctrl.signal); } finally { clearTimeout(timer); }
    };

    const num = (x) => {
      if (x == null) return null;
      const n = Number(x?.raw ?? x);
      return Number.isFinite(n) ? n : null;
    };

    const shape = (obj = {}) => {
      const price = num(obj.price);
      const prev  = num(obj.previousClose);
      return {
        symbol: obj.symbol,
        longName: obj.longName,
        price,
        previousClose: prev,
        change: (price != null && prev != null) ? (price - prev) : num(obj.change),
        changePercent:
          (price != null && prev != null && prev !== 0)
            ? ((price - prev) / prev) * 100
            : num(obj.changePercent),
      };
    };

    function normalizeFromQuote(q) {
      if (!q) return null;
      return shape({
        symbol: q.symbol || symbol,
        longName: q.longName || q.shortName || symbol,
        price: q.regularMarketPrice,
        previousClose: q.regularMarketPreviousClose,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
      });
    }

    // 1) Yahoo chart v8 (range=5d, interval=1d)
    async function tryYahooChart(signal) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
      const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow", cache: "no-store", signal });
      if (!r.ok) throw new Error(`chart ${r.status}`);
      const j = await r.json();
      const result = j?.chart?.result?.[0];
      if (!result) throw new Error("chart no result");

      const meta = result.meta || {};
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const lastClose = closes.filter((v) => v != null).slice(-1)[0];
      const price = num(meta.regularMarketPrice) ?? num(lastClose);
      const prev =
        num(meta.chartPreviousClose) ??
        (closes.filter((v) => v != null).length >= 2
          ? num(closes.filter((v) => v != null).slice(-2)[0])
          : null);

      return shape({
        symbol: meta.symbol || symbol,
        longName: meta.longName || meta.shortName || symbol,
        price,
        previousClose: prev,
      });
    }

    // 2) Yahoo quote v7
    async function tryYahooV7(signal) {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow", cache: "no-store", signal });
      if (!r.ok) throw new Error(`yahoo v7 ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      const out = normalizeFromQuote(q);
      if (!out) throw new Error("yahoo v7 no result");
      return out;
    }

    // 3) Yahoo quoteSummary v10 (price 모듈)
    async function tryYahooV10(signal) {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price&region=${region}`;
      const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow", cache: "no-store", signal });
      if (!r.ok) throw new Error(`yahoo v10 ${r.status}`);
      const j = await r.json();
      const P = j?.quoteSummary?.result?.[0]?.price;
      if (!P) throw new Error("yahoo v10 no price");
      return shape({
        symbol: P.symbol || symbol,
        longName: P.longName || P.shortName || symbol,
        price: P.regularMarketPrice,
        previousClose: P.regularMarketPreviousClose,
        change: P.regularMarketChange,
        changePercent: P.regularMarketChangePercent,
      });
    }

    // 4) RapidAPI - apidojo
    async function tryApidojo(signal) {
      if (!RAPID) throw new Error("RAPIDAPI_KEY missing");
      const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=${region}&symbols=${encodeURIComponent(symbol)}`;
      const r = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          "x-rapidapi-key": RAPID,
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
        },
        signal
      });
      if (!r.ok) throw new Error(`apidojo ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      const out = normalizeFromQuote(q);
      if (!out) throw new Error("apidojo no result");
      return out;
    }

    // 5) RapidAPI - yh-finance
    async function tryYhFinance(signal) {
      if (!RAPID) throw new Error("RAPIDAPI_KEY missing");
      const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region}`;
      const r = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          "x-rapidapi-key": RAPID,
          "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        },
        signal
      });
      if (!r.ok) throw new Error(`yh-finance ${r.status}`);
      const j = await r.json();
      const P = j?.price || {};
      return shape({
        symbol: P.symbol || symbol,
        longName: P.longName || P.shortName || symbol,
        price: P.regularMarketPrice,
        previousClose: P.regularMarketPreviousClose,
        change: P.regularMarketChange,
        changePercent: P.regularMarketChangePercent,
      });
    }

    let data, reasons = [];
    for (const fn of [tryYahooChart, tryYahooV7, tryYahooV10, tryApidojo, tryYhFinance]) {
      try {
        data = await withTimeout(fn, 6000);
        if (data && (data.price != null || data.previousClose != null)) break;
      } catch (e) {
        reasons.push(String(e?.message || e));
      }
    }

    if (!data) {
      console.error("stocks fail", { symbol, reasons });
      return res.status(502).json({ error: "quote fetch failed", symbol, reasons });
    }

    // 캐시 완전 차단 (CDN/브라우저)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    // 디버깅용 에코
    res.setHeader("x-symbol-echo", data?.symbol || symbol);

    return res.status(200).json(data);
  } catch (e) {
    console.error("stocks 500", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
