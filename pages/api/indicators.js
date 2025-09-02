import dayjs from 'dayjs';

async function fred(series_id, apiKey) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&observation_start=2020-01-01&file_type=json&api_key=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${series_id} 실패`);
  const j = await r.json();
  const obs = j?.observations || [];
  const lastValid = [...obs].reverse().find(o => o.value !== ".");
  return { id: series_id, latest: lastValid?.value ?? null, date: lastValid?.date ?? null };
}

export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "환경변수 FRED_API_KEY 없음" });

    // 대표지표: WTI, USD/KRW, US CPI
    const series = {
      wti: "DCOILWTICO",
      usdkrw: "DEXKOUS",
      us_cpi: "CPIAUCSL"
    };
    const [wti, usdkrw, cpi] = await Promise.all([
      fred(series.wti, apiKey),
      fred(series.usdkrw, apiKey),
      fred(series.us_cpi, apiKey)
    ]);
    res.status(200).json({ wti, usdkrw, cpi });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
