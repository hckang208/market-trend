import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "환경변수 RAPIDAPI_KEY 없음" });
    }

    // ✅ 환율 (USD/KRW) – 무료 API
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fxData = await fxRes.json();
    const usdKrw = fxData?.rates?.KRW || null;

    // ✅ RapidAPI 공통 옵션
    const headers = {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
    };

    // ✅ 원유 (WTI Futures: CL=F)
    const oilRes = await fetch(
      "https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=CL=F&region=US",
      { headers }
    );
    const oilData = await oilRes.json();

    // ✅ 면화 (Cotton Futures: CT=F)
    const cottonRes = await fetch(
      "https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=CT=F&region=US",
      { headers }
    );
    const cottonData = await cottonRes.json();

    // ✅ 로그 출력 (Vercel Logs에서 확인 가능)
    console.log("FX:", usdKrw);
    console.log("OIL RESPONSE:", oilData);
    console.log("COTTON RESPONSE:", cottonData);

    // ✅ 값 추출
    const oil = oilData?.price?.regularMarketPrice?.raw || null;
    const cotton = cottonData?.price?.regularMarketPrice?.raw || null;

    // ✅ 결과 반환
    res.status(200).json({ usdKrw, oil, cotton, scfi: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
