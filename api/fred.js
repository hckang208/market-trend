import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
