import axios from 'axios';

export default async function handler(req, res) {
  try {
    // 예시: 특정 리테일러 티커 (WMT, TGT)
    const tickers = ["WMT", "TGT"];
    const results = {};
    for (const t of tickers) {
      const resp = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${t}`);
      results[t] = resp.data.chart.result[0].meta;
    }
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}