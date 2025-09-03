// pages/api/stocks.js
/**
 * Robust stocks endpoint with multi-source fallback:
 * 1) Yahoo Finance v7 (query2) with User-Agent header
 * 2) Yahoo Finance v7 (query1) as secondary
 * 3) Stooq daily CSV (last 2 closes) as fallback (no key needed)
 */
export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "").trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  // Map symbols for Stooq
  const stooqMap = (sym) => {
    // US stocks: lowercase + .us
    const us = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA"];
    if (us.includes(sym.toUpperCase())) return `${sym.toLowerCase()}.us`;
    // Tokyo
    if (sym.toUpperCase() === "9983.T") return "9983.jp";
    return null;
  };

  async function fetchYahoo(host) {
    const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
      },
    });
    if (!r.ok) throw new Error(`Yahoo ${host} status ${r.status}`);
    const j = await r.json();
    const q = j?.quoteResponse?.result?.[0];
    if (!q) throw new Error("Yahoo: empty result");
    const name = q.longName || q.shortName || symbol;
    const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null;
    const prevClose = q.regularMarketPreviousClose ?? q.previousClose ?? null;
    const pct = (isFinite(Number(price)) && isFinite(Number(prevClose)) && Number(prevClose) !== 0)
      ? ((Number(price) - Number(prevClose)) / Number(prevClose)) * 100
      : (isFinite(Number(q.regularMarketChangePercent)) ? Number(q.regularMarketChangePercent) : null);
    return {
      symbol,
      name,
      longName: name,
      regularMarketPrice: isFinite(Number(price)) ? Number(price) : null,
      regularMarketPreviousClose: isFinite(Number(prevClose)) ? Number(prevClose) : null,
      changePercent: isFinite(Number(pct)) ? Number(pct) : null,
      source: `yahoo:${host}`,
    };
  }

  async function fetchStooq() {
    const s = stooqMap(symbol);
    if (!s) throw new Error("No stooq mapping");
    // Daily CSV for last N days
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&i=d`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Stooq status ${r.status}`);
    const csv = await r.text();
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 3) throw new Error("Stooq not enough data");
    // last two rows
    const last = lines[lines.length - 1].split(",");
    const prev = lines[lines.length - 2].split(",");
    const closeIdx = 4; // Date,Open,High,Low,Close,Volume
    // Sometimes format is Date,Open,High,Low,Close,Volume (6 cols)
    const price = Number(last[closeIdx]);
    const prevClose = Number(prev[closeIdx]);
    if (!isFinite(price) || !isFinite(prevClose)) throw new Error("Stooq parse fail");
    const pct = ((price - prevClose) / prevClose) * 100;
    return {
      symbol,
      name: symbol,
      longName: symbol,
      regularMarketPrice: price,
      regularMarketPreviousClose: prevClose,
      changePercent: pct,
      source: "stooq",
    };
  }

  try {
    try {
      // Try Yahoo query2 then query1
      try {
        const y2 = await fetchYahoo("query2.finance.yahoo.com");
        return res.status(200).json(y2);
      } catch (_) {}
      const y1 = await fetchYahoo("query1.finance.yahoo.com");
      return res.status(200).json(y1);
    } catch (_) {
      // Fallback to Stooq
      const s = await fetchStooq();
      return res.status(200).json(s);
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
