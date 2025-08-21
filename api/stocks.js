import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const tickers = ["NKE", "LULU", "HBI", "RL", "GPS"]; // 나이키, 룰루레몬, 한센즈 등
    const results = [];

    for (let t of tickers) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=5d`;
      const resp = await fetch(url);
      const json = await resp.json();

      const meta = json.chart.result[0].meta;
      const close = json.chart.result[0].indicators.quote[0].close;
      const price = close[close.length - 1];
      const prev = close[close.length - 2];
      const change = (((price - prev) / prev) * 100).toFixed(2);

      results.push({
        ticker: t,
        name: meta.symbol,
        price: price.toFixed(2),
        change,
        trend: close.map(v => v ? v.toFixed(2) : null)
      });
    }

    res.status(200).json({ data: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Stock API error" });
  }
}
