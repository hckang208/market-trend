import axios from 'axios';

export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const series = ["CPIAUCSL", "RETAILIRSA"];
    const results = {};
    for (const s of series) {
      const resp = await axios.get(`https://api.stlouisfed.org/fred/series/observations`, {
        params: { series_id: s, api_key: apiKey, file_type: "json" }
      });
      results[s] = resp.data.observations.slice(-5);
    }
    res.status(200).json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}