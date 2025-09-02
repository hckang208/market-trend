import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const rapidKey = process.env.RAPIDAPI_KEY;
    const fredKey = process.env.FRED_API_KEY;

    if (!rapidKey) return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    if (!fredKey) return res.status(500).json({ error: "환경변수 FRED_API_KEY 없음" });

    // ✅ 환율 (USD/KRW)
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fxData = await fxRes.json();
    const usdKrw = fxData?.rates?.KRW || null;

    // ✅ Yahoo Finance (유가 + 면화)
    const headers = {
      "X-RapidAPI-Key": rapidKey,
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

    // ✅ FRED API Helper
    async function getFredSeries(id) {
      const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${fredKey}&file_type=json`);
      const d = await r.json();
      const last = d?.observations?.filter(o => o.value !== ".").pop();
      return last ? Number(last.value) : null;
    }

    // ✅ FRED 데이터 가져오기
    const cpiApparel = await getFredSeries("CPIAPPSL");   // 의류 CPI
    const retailSales = await getFredSeries("RSMGCS");    // 의류 리테일 매출
    const inventoryRatio = await getFredSeries("MRTSSM4481USI"); // 의류 재고/판매 비율

    // ✅ SCFI placeholder
    const scfi = null;

    // ✅ 결과 반환
    res.status(200).json({
      usdKrw,
      oil,
      cotton,
      scfi,
      cpiApparel,
      retailSales,
      inventoryRatio
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
