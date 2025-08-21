import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    console.log("📈 stocks.js API 호출됨!!");

    const symbol = req.query.symbol || "AAPL";
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=demo`;

    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
}
