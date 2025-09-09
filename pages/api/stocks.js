export const config = { runtime: 'nodejs' };

async function fetchRapidYahoo(symbol) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY missing');
  const region = symbol.endsWith('.T') ? 'JP' : 'US';
  const url = `https://yh-finance.p.rapidapi.com/market/v2/get-quotes?region=${region}&symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com',
      'User-Agent': 'HansolDashboard/1.0'
    }
  });
  if (!res.ok) throw new Error('RapidAPI HTTP ' + res.status);
  const j = await res.json();
  const q = j?.quoteResponse?.result?.[0];
  if (!q) throw new Error('RapidAPI empty');
  const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
  const prev = q.regularMarketPreviousClose ?? q.previousClose ?? null;
  const changePercent = q.regularMarketChangePercent ?? (
    (isFinite(price) && isFinite(prev) && Number(prev) !== 0)
      ? ((Number(price) - Number(prev)) / Number(prev)) * 100
      : null
  );
  return {
    symbol,
    longName: q.longName || q.shortName || symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: prev,
    changePercent
  };
}

async function fetchYahoo(symbol) {
  const region = symbol.endsWith('.T') ? 'JP' : 'US';
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbol);
  const res = await fetch(url, { headers: { 'User-Agent': 'HansolDashboard/1.0' } });
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
  const j = await res.json();
  const q = j?.quoteResponse?.result?.[0];
  if (!q) throw new Error('Yahoo empty');
  const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
  const prev = q.regularMarketPreviousClose ?? q.previousClose ?? null;
  const changePercent = q.regularMarketChangePercent ?? (
    (isFinite(price) && isFinite(prev) && Number(prev) !== 0)
      ? ((Number(price) - Number(prev)) / Number(prev)) * 100
      : null
  );
  return {
    symbol,
    longName: q.longName || q.shortName || symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: prev,
    changePercent
  };
}

async function fetchStooq(symbol) {
  const stooqSym = symbol.toLowerCase();
  const url = 'https://stooq.com/q/l/?s=' + encodeURIComponent(stooqSym) + '&f=sd2t2ohlcv&h&e=csv';
  const res = await fetch(url, { headers: { 'User-Agent': 'HansolDashboard/1.0' } });
  if (!res.ok) throw new Error('Stooq HTTP ' + res.status);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('Stooq empty');
  const cols = lines[1].split(',');
  const close = parseFloat(cols[6]);
  const price = isNaN(close) ? null : close;
  return {
    symbol,
    longName: symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: null,
    changePercent: null,
    source: 'stooq'
  };
}

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim();
  if (!symbol) return res.status(200).json({ error: 'missing symbol' });
  try {
    const viaRapid = await fetchRapidYahoo(symbol);
    return res.status(200).json(viaRapid);
  } catch (_) {
    try {
      const viaYahoo = await fetchYahoo(symbol);
      return res.status(200).json(viaYahoo);
    } catch (__){
      try {
        const viaStooq = await fetchStooq(symbol);
        return res.status(200).json(viaStooq);
      } catch (e) {
        return res.status(200).json({ symbol, error: String(e.message || e) });
      }
    }
  }
}
