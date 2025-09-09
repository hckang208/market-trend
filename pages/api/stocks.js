export const config = { runtime: 'nodejs' };

async function fetchYahoo(symbol) {
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbol);
  const res = await fetch(url, { headers: { 'User-Agent': 'HansolDashboard/1.0' } });
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
  const j = await res.json();
  const q = j?.quoteResponse?.result?.[0];
  if (!q) throw new Error('Yahoo empty');
  const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
  const change = q.regularMarketChangePercent ?? 0;
  return { price, change, longName: q.longName, regularMarketPrice: q.regularMarketPrice, regularMarketPreviousClose: q.regularMarketPreviousClose };
}

async function fetchStooq(symbol) {
  const url = 'https://stooq.com/q/l/?s=' + encodeURIComponent(symbol.toLowerCase()) + '&f=sd2t2ohlcv&h&e=csv';
  const res = await fetch(url, { headers: { 'User-Agent': 'HansolDashboard/1.0' } });
  if (!res.ok) throw new Error('Stooq HTTP ' + res.status);
  const csv = await res.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('Stooq empty');
  const cols = lines[1].split(',');
  const close = parseFloat(cols[6]);
  return { price: isNaN(close) ? null : close, change: null };
}

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim();
  if (!symbol) {
    // return 200 to avoid frontend crash, but explain
    return res.status(200).json({ error: 'missing symbol' });
  }
  try {
    const y = await fetchYahoo(symbol);
    return res.status(200).json({ symbol, ...y });
  } catch (e) {
    try {
      const s = await fetchStooq(symbol);
      return res.status(200).json({ symbol, ...s, source: 'stooq' });
    } catch (e2) {
      return res.status(200).json({ symbol, error: String(e2.message || e2) });
    }
  }
}
