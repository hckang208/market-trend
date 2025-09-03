// pages/api/stocks.js
// 표준 응답: { symbol, longName, price, previousClose, change, changePercent }
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || "").trim();
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    const region = symbol.endsWith(".T") ? "JP" : "US";
    const RAPID = process.env.RAPIDAPI_KEY;

    // 공통 헤더 (일부 제공자는 UA/Referer 없으면 차단)
    const COMMON_HEADERS = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    };

    const num = (x) => {
      if (x == null) return null;
      const n = Number(x?.raw ?? x);
      return Number.isFinite(n) ? n : null;
    };

    function normalizeFromQuote(q) {
      if (!q) return null;
      return {
        symbol: q.symbol || symbol,
        longName: q.longName || q.shortName || symbol,
        price: num(q.regularMarketPrice),
        previousClose: num(q.regularMarketPreviousClose),
        change: num(q.regularMarketChange),
        changePercent: num(q.regularMarketChangePercent),
      };
    }

    // 1) Yahoo quote v7 (공용) - 가장 가볍고 빠름
    async function tryYahooV7() {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
        symbol
      )}`;
      const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow" });
      if (!r.ok) throw new Error(`yahoo v7 ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      const out = normalizeFromQuote(q);
      if (!out) throw new Error("yahoo v7 no result");
      return out;
    }

    // 2) Yahoo quoteSummary v10 (공용, price 모듈)
    async function tryYahooV10() {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
        symbol
      )}?modules=price&region=${region}`;
      const r = await fetch(url, { headers: COMMON_HEADERS, redirect: "follow" });
      if (!r.ok) throw new Error(`yahoo v10 ${r.status}`);
      const j = await r.json();
      const P = j?.quoteSummary?.result?.[0]?.price;
      if (!P) throw new Error("yahoo v10 no price");
      return {
        symbol: P.symbol || symbol,
        longName: P.longName || P.shortName || symbol,
        price: num(P.regularMarketPrice),
        previousClose: num(P.regularMarketPreviousClose),
        change: num(P.regularMarketChange),
        changePercent: num(P.regularMarketChangePercent),
      };
    }

    // 3) RapidAPI - apidojo
    async function tryApidojo() {
      if (!RAPID) throw new Error("RAPIDAPI_KEY missing");
      const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=${region}&symbols=${encodeURIComponent(
        symbol
      )}`;
      const r = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          "x-rapidapi-key": RAPID,
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
        },
      });
      if (!r.ok) throw new Error(`apidojo ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      const out = normalizeFromQuote(q);
      if (!out) throw new Error("apidojo no result");
      return out;
    }

    // 4) RapidAPI - yh-finance
    async function tryYhFinance() {
      if (!RAPID) throw new Error("RAPIDAPI_KEY missing");
      const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(
        symbol
      )}&region=${region}`;
      const r = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          "x-rapidapi-key": RAPID,
          "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        },
      });
      if (!r.ok) throw new Error(`yh-finance ${r.status}`);
      const j = await r.json();
      const P = j?.price || {};
      return {
        symbol: P.symbol || symbol,
        longName: P.longName || P.shortName || symbol,
        price: num(P.regularMarketPrice),
        previousClose: num(P.regularMarketPreviousClose),
        change: num(P.regularMarketChange),
        changePercent: num(P.regularMarketChangePercent),
      };
    }

    // 순차 폴백
    let data, reasons = [];
    for (const fn of [tryYahooV7, tryYahooV10, tryApidojo, tryYhFinance]) {
      try {
        data = await fn();
        if (data && (data.price != null || data.previousClose != null)) break;
      } catch (e) {
        reasons.push(String(e.message || e));
      }
    }

    if (!data) {
      // 디버그가 쉬우도록 이유도 같이 반환
      return res.status(502).json({ error: "quote fetch failed", symbol, reasons });
    }

    // CDN 캐시(5분)
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
