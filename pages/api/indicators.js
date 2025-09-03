// pages/api/indicators.js
import dayjs from 'dayjs';

const FRED = 'https://api.stlouisfed.org/fred/series/observations';
const KEY = process.env.FRED_API_KEY;

// 최근 N개 관측치 (내림차순 받아서 정렬 보정)
async function fredSeries(seriesId, limit = 400) {
  const url = `${FRED}?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(KEY)}&file_type=json&sort_order=desc&limit=${limit}&observation_end=${dayjs().format('YYYY-MM-DD')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FRED ${seriesId} 실패: ${r.status}`);
  const j = await r.json();
  // '.' 제거하고 오름차순으로
  const arr = (j?.observations || [])
    .filter(o => o?.value && o.value !== '.')
    .map(o => ({ d: o.date, v: Number(o.value) }))
    .reverse();

  if (!arr.length) return { latest: null, date: null, series: [] };

  const latestObj = arr[arr.length - 1];
  const prevObj = arr.length >= 2 ? arr[arr.length - 2] : null;
  const yoyObj = arr.length >= 13 ? arr[arr.length - 13] : null;

  const latest = latestObj.v;
  const prev = prevObj?.v ?? null;
  const yoyBase = yoyObj?.v ?? null;

  const prevPct = (prev != null && prev !== 0) ? ((latest - prev) / prev) * 100 : null;
  const yoyPct = (yoyBase != null && yoyBase !== 0) ? ((latest - yoyBase) / yoyBase) * 100 : null;

  return {
    latest,
    date: latestObj.d,
    prev,
    prevDate: prevObj?.d ?? null,
    yoyBase,
    yoyDate: yoyObj?.d ?? null,
    prevPct,
    yoyPct,
    series: arr.slice(-30), // 스파크라인 용 최근 30개
  };
}

async function safe(fn) {
  try { return await fn(); } catch (e) { return { error: e.message, latest: null, series: [] }; }
}

export default async function handler(req, res) {
  try {
    if (!KEY) return res.status(500).json({ error: '환경변수 FRED_API_KEY 없음' });

    // 요구사항: 기존 3종 + 기준금리 + 스프레드 + 재고지수 + 실업률
    const wtiId    = 'DCOILWTICO'; // WTI(달별/일별)
    const usdkrwId = 'DEXKOUS';    // USD/KRW
    const cpiId    = 'CPIAUCSL';   // CPI (Index)
    const fedId    = 'FEDFUNDS';   // Fed Funds Effective Rate
    const sprId    = 'T10Y2Y';     // 10Y-2Y (퍼센트 포인트)
    const invId    = 'ISRATIO';    // Inventories/Sales Ratio
    const unempId  = 'UNRATE';     // Unemployment Rate

    const [
      wti, usdkrw, cpi, fed, spr, invRatio, unrate
    ] = await Promise.all([
      safe(() => fredSeries(wtiId)),
      safe(() => fredSeries(usdkrwId)),
      safe(() => fredSeries(cpiId, 100)),
      safe(() => fredSeries(fedId)),
      safe(() => fredSeries(sprId)),
      safe(() => fredSeries(invId, 200)),
      safe(() => fredSeries(unempId, 200)),
    ]);

    // 스프레드는 bp로 변환 (series/prev/yoy 모두)
    function toBp(obj) {
      if (!obj || obj.latest == null) return obj;
      const conv = x => (x == null ? null : Number((x * 100).toFixed(2)));
      return {
        ...obj,
        latest: conv(obj.latest),
        prev: conv(obj.prev),
        yoyBase: conv(obj.yoyBase),
        prevPct: obj.prevPct, // 퍼센트 변화율은 그대로
        yoyPct: obj.yoyPct,
        series: (obj.series || []).map(o => ({ d: o.d, v: conv(o.v) }))
      };
    }
    const t10y2y = toBp(spr);

    return res.status(200).json({
      wti,
      usdkrw,
      cpi,
      fedfunds: fed,
      t10y2y,
      inventory_ratio: invRatio,
      unemployment: unrate,
      _ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
