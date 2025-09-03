import dayjs from 'dayjs';

const FRED = 'https://api.stlouisfed.org/fred/series/observations';
const KEY = process.env.FRED_API_KEY;

// FRED에서 최신 유효값 가져오기 ('.' 값 패스)
async function fredLatest(seriesId) {
  const url = `${FRED}?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(KEY)}&file_type=json&sort_order=desc&limit=10&observation_end=${dayjs().format('YYYY-MM-DD')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${seriesId} 실패: ${r.status}`);
  const j = await r.json();
  const obs = (j?.observations || []).find(o => o?.value && o.value !== '.');
  if (!obs) return { latest: null, date: null, seriesId };
  return { latest: Number(obs.value), date: obs.date, seriesId };
}

// 안전 실행 헬퍼
async function safe(fn) {
  try { return await fn(); } catch (e) { return { error: e.message }; }
}

export default async function handler(req, res) {
  try {
    if (!KEY) return res.status(500).json({ error: '환경변수 FRED_API_KEY 없음' });

    // 기존 3종
    const wtiId   = 'DCOILWTICO';   // WTI
    const usdkrwId= 'DEXKOUS';      // USD/KRW
    const cpiId   = 'CPIAUCSL';     // CPI (All Items)

    // 신규: 금리/스프레드/소매
    const fedId   = 'FEDFUNDS';     // 연방기금금리(효과)
    const dgs10Id = 'DGS10';        // 10Y
    const dgs2Id  = 'DGS2';         // 2Y
    const sprId   = 'T10Y2Y';       // 10Y-2Y 스프레드 (퍼센트 포인트)

    const retailTotalId    = 'RSAFS';        // 소매판매 총액 (Advance, Retail & Food Services)
    const retailClothingId = 'MRTSSM448USN'; // 의류·액세서리 매출 (시즌조정)

    const [
      wti, usdkrw, cpi,
      fed, dgs10, dgs2, spr,
      retailTotal, retailClothing
    ] = await Promise.all([
      safe(() => fredLatest(wtiId)),
      safe(() => fredLatest(usdkrwId)),
      safe(() => fredLatest(cpiId)),
      safe(() => fredLatest(fedId)),
      safe(() => fredLatest(dgs10Id)),
      safe(() => fredLatest(dgs2Id)),
      safe(() => fredLatest(sprId)),
      safe(() => fredLatest(retailTotalId)),
      safe(() => fredLatest(retailClothingId)),
    ]);

    // 스프레드 보정: bp 표기를 위해 *100
    let spread = spr;
    if (spr && spr.latest != null) {
      spread = { latest: Number((spr.latest * 100).toFixed(2)), date: spr.date };
    } else if (dgs10?.latest != null && dgs2?.latest != null) {
      spread = { latest: Number(((dgs10.latest - dgs2.latest) * 100).toFixed(2)), date: dgs10.date || dgs2.date };
    }

    return res.status(200).json({
      wti,
      usdkrw,
      cpi,
      fedfunds: fed,
      dgs10,
      dgs2,
      t10y2y: spread,
      retail_sales_total: retailTotal,
      retail_sales_clothing: retailClothing,
      _ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
