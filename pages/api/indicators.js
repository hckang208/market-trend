// /pages/api/indicators.js
import dayjs from 'dayjs';

const FRED = 'https://api.stlouisfed.org/fred/series/observations';
const KEY = process.env.FRED_API_KEY;

// FRED 최신 유효값 ('.' 값 제외) 가져오기
async function fredLatest(seriesId) {
  const url = `${FRED}?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(KEY)}&file_type=json&sort_order=desc&limit=10&observation_end=${dayjs().format('YYYY-MM-DD')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${seriesId} 실패: ${r.status}`);
  const j = await r.json();
  const obs = (j?.observations || []).find(o => o?.value && o.value !== '.');
  if (!obs) return { latest: null, date: null, seriesId };
  return { latest: Number(obs.value), date: obs.date, seriesId };
}

// 안전 실행
async function safe(fn) {
  try { return await fn(); } catch (e) { return { error: e.message }; }
}

export default async function handler(req, res) {
  try {
    if (!KEY) return res.status(500).json({ error: '환경변수 FRED_API_KEY 없음' });

    // 기본 3종
    const wtiId    = 'DCOILWTICO';   // WTI
    const usdkrwId = 'DEXKOUS';      // USD/KRW
    const cpiId    = 'CPIAUCSL';     // CPI (All Items)

    // 추가: 금리(기준금리, 스프레드) + 재고지수 + 고용
    const fedId    = 'FEDFUNDS';     // 연방기금금리(효과)
    const sprId    = 'T10Y2Y';       // 10Y-2Y 스프레드 (퍼센트포인트)
    const invId    = 'ISRATIO';      // 총 사업체 재고/판매 비율 (재고지수 proxy)
    const unempId  = 'UNRATE';       // 실업률
    const payrollId= 'PAYEMS';       // (옵션) 비농업 취업자수(천명)

    const [
      wti, usdkrw, cpi,
      fed, spr, invRatio, unrate, payroll
    ] = await Promise.all([
      safe(() => fredLatest(wtiId)),
      safe(() => fredLatest(usdkrwId)),
      safe(() => fredLatest(cpiId)),
      safe(() => fredLatest(fedId)),
      safe(() => fredLatest(sprId)),
      safe(() => fredLatest(invId)),
      safe(() => fredLatest(unempId)),
      safe(() => fredLatest(payrollId)),
    ]);

    // 스프레드(bp)로 변환
    let t10y2y = spr;
    if (spr && spr.latest != null) {
      t10y2y = { latest: Number((spr.latest * 100).toFixed(2)), date: spr.date };
    }

    return res.status(200).json({
      // 기존
      wti,
      usdkrw,
      cpi,
      // 금리/스프레드
      fedfunds: fed,
      t10y2y,
      // 재고/고용
      inventory_ratio: invRatio,   // ISRATIO
      unemployment: unrate,        // UNRATE
      payrolls: payroll,           // PAYEMS (화면에서 안 쓰면 무시)
      _ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
