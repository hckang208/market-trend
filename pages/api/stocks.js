// pages/api/stocks.js
export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "").trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  async function fetchYahoo(sym) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Yahoo quote fail");
    const j = await r.json();
    const q = j?.quoteResponse?.result?.[0];
    if (!q) throw new Error("No quote");
    const name = q.longName || q.shortName || sym;
    const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null;
    const prevClose = q.regularMarketPreviousClose ?? q.previousClose ?? null;
    const changePercent =
      isFinite(Number(price)) && isFinite(Number(prevClose)) && Number(prevClose) !== 0
        ? ((Number(price) - Number(prevClose)) / Number(prevClose)) * 100
        : (isFinite(Number(q.regularMarketChangePercent)) ? Number(q.regularMarketChangePercent) : null);

    return {
      symbol: sym,
      name,
      longName: name,
      regularMarketPrice: isFinite(Number(price)) ? Number(price) : null,
      regularMarketPreviousClose: isFinite(Number(prevClose)) ? Number(prevClose) : null,
      changePercent: isFinite(Number(changePercent)) ? Number(changePercent) : null,
    };
  }

  try {
    const data = await fetchYahoo(symbol);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
