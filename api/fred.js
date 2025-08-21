import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const seriesId = "GDP"; // 테스트용
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;

    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching FRED data:", error);
    res.status(500).json({ error: "Failed to fetch FRED data" });
  }
}
