import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    // ✅ 환율 (USD/KRW)
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fxData = await fxRes.json();
    const usdKrw = fxData?.rates?.KRW || null;

    // ✅ Yahoo Finance (유가 + 면화)
    const headers = {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
    };

    const quotesRes = await fetch(
      "https://yh-finance.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=CL=F,CT=F",
      { headers }
    );
    const quotesData = await quotesRes.json();

    const oilQuote = quotesData?.quoteResponse?.result?.find(r => r.symbol === "CL=F");
    const cottonQuote = quotesData?.quoteResponse?.result?.find(r => r.symbol === "CT=F");

    const oil = oilQuote?.regularMarketPrice || null;
    const cotton = cottonQuote?.regularMarketPrice || null;

    // ✅ 로그 (Vercel Logs 확인용)
    console.log("Quotes Data:", quotesData);

    // ✅ SCFI (placeholder)
    const scfi = null;

    res.status(200).json({ usdKrw, oil, cotton, scfi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
