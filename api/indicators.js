import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    // 환율 (USD/KRW)
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fxData = await fxRes.json();
    const usdKrw = fxData?.rates?.KRW || null;

    const headers = {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
    };

    // 안전한 fetch 함수
    async function safeFetch(url) {
      const r = await fetch(url, { headers });
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        return { error: "Invalid JSON", raw: text };
      }
    }

    const oilData = await safeFetch("https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=CL=F&region=US");
    const cottonData = await safeFetch("https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=CT=F&region=US");

    console.log("OIL RAW:", oilData);
    console.log("COTTON RAW:", cottonData);

    const oil = oilData?.price?.regularMarketPrice?.raw || null;
    const cotton = cottonData?.price?.regularMarketPrice?.raw || null;

    res.status(200).json({ usdKrw, oil, cotton, scfi: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
