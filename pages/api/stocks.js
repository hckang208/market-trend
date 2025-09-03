// pages/api/stocks.js
// 표준화된 응답 형식으로 반환:
// { symbol, longName, price, previousClose, change, changePercent }
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || '').trim();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });

    const RAPID = process.env.RAPIDAPI_KEY;
    const region = symbol.endsWith('.T') ? 'JP' : 'US';

    // 숫자 안전 변환
    const num = (x) => {
      if (x == null) return null;
      const n = Number(x?.raw ?? x);
      return Number.isFinite(n) ? n : null;
    };

    // 1) apidojo (Yahoo Finance) - get-quotes
    async function tryApidojo() {
      if (!RAPID) throw new Error('RAPIDAPI_KEY missing');
      const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=${region}&symbols=${encodeURIComponent(symbol)}`;
      const r = await fetch(url, {
        headers: {
          'x-rapidapi-key': RAPID,
          'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
        },
      });
      if (!r.ok) throw new Error(`apidojo status ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      if (!q) throw new Error('apidojo no result');

      return {
        symbol: q.symbol || symbol,
        longName: q.longName || q.shortName || symbol,
        price: num(q.regularMarketPrice),
        previousClose: num(q.regularMarketPreviousClose),
        change: num(q.regularMarketChange),
        changePercent: num(q.regularMarketChangePercent),
      };
    }

    // 2) yh-finance (RapidAPI) - get-summary
    async function tryYhFinance() {
      if (!RAPID) throw new Error('RAPIDAPI_KEY missing');
      const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region}`;
      const r = await fetch(url, {
        headers: {
          'x-rapidapi-key': RAPID,
          'x-rapidapi-host': 'yh-finance.p.rapidapi.com',
        },
      });
      if (!r.ok) throw new Error(`yh-finance status ${r.status}`);
      const j = await r.json();
      const P = j?.price || {};
      return {
        symbol: P?.symbol || symbol,
        longName: P?.longName || P?.shortName || symbol,
        price: num(P?.regularMarketPrice),
        previousClose: num(P?.regularMarketPreviousClose),
        change: num(P?.regularMarketChange),
        changePercent: num(P?.regularMarketChangePercent),
      };
    }

    // 3) Yahoo public quote API (백업)
    async function tryYahooPublic() {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`yahoo public status ${r.status}`);
      const j = await r.json();
      const q = j?.quoteResponse?.result?.[0];
      if (!q) throw new Error('yahoo public no result');

      return {
        symbol: q.symbol || symbol,
        longName: q.longName || q.shortName || symbol,
        price: num(q.regularMarketPrice),
        previousClose: num(q.regularMarketPreviousClose),
        change: num(q.regularMarketChange),
        changePercent: num(q.regularMarketChangePercent),
      };
    }

    // 순차 시도 (rate-limit/지역 이슈 대비)
    let data, errors = [];
    for (const fn of [tryApidojo, tryYhFinance, tryYahooPublic]) {
      try {
        data = await fn();
        if (data && (data.price != null || data.previousClose != null)) break;
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (!data) {
      return res.status(502).json({ error: 'quote fetch failed', reasons: errors });
    }

    // 캐시(엣지/CDN) – 5분
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
