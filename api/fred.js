import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const series = [
      { id: "CPIAUCSL", name: "소비자물가지수 (CPI)" },
      { id: "RETAILIRSA", name: "소매판매지수" },
      { id: "UNRATE", name: "실업률" },
      { id: "PPIACO", name: "생산자물가지수 (PPI)" },
    ];

    const results = [];
    for (let s of series) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${apiKey}&file_type=json`;
      const resp = await fetch(url);
      const json = await resp.json();
      const last = json.observations[json.observations.length - 1];
      results.push({
        name: s.name,
        value: last.value,
        date: last.date
      });
    }

    res.status(200).json({ data: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "FRED API error" });
  }
}
