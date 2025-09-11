import { useEffect, useState } from 'react';
const fmt = (n, d=2) => {
  const v = Number(n); if(!isFinite(v)) return '-';
  return v.toLocaleString(undefined,{maximumFractionDigits:d});
};
const pct = (n, d=2) => {
  const v = Number(n); if(!isFinite(v)) return '-';
  const s = v>=0?'+':''; return s + v.toFixed(d) + '%';
};

export default function Home(){
  const [meta,setMeta] = useState(null);
  const [ind,setInd] = useState(null);
  const [stocks,setStocks] = useState(null);

  useEffect(()=>{
    fetch('/data/meta.json').then(r=>r.json()).then(setMeta).catch(()=>{});
    fetch('/data/indicators.json').then(r=>r.json()).then(setInd).catch(()=>{});
    fetch('/data/stocks.json').then(r=>r.json()).then(setStocks).catch(()=>{});
  },[]);

  return (
    <div className="wrap">
      <h1>부자재구매현황 DASHBOARD (SAMPLE DATA)</h1>
      <div className="muted">
        마지막 갱신: {meta?.updatedAtISO ? new Date(meta.updatedAtISO).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : '-'}
        <span className="badge" style={{marginLeft:8}}>매일 오전 9시(KST) 정적 갱신</span>
      </div>

      <div className="grid" style={{marginTop:16}}>
        <section className="card" style={{gridColumn:'span 5'}}>
          <h2>주요 지표</h2>
          <table>
            <tbody>
              <tr><th>WTI(usd/bbl)</th><td>{fmt(ind?.wti?.last)}</td><td className="muted">{ind?.wti?.lastDate||''}</td></tr>
              <tr><th>USD/KRW(FRED)</th><td>{fmt(ind?.usdkrwFred?.last)}</td><td className="muted">{ind?.usdkrwFred?.lastDate||''}</td></tr>
              <tr><th>USD/KRW(Spot)</th><td>{fmt(ind?.usdkrwNow?.price)}</td><td className="muted">{ind?.usdkrwNow?.ts? new Date(ind.usdkrwNow.ts).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):''}</td></tr>
              <tr><th>CPI(US)</th><td>{fmt(ind?.cpi?.last)}</td><td className="muted">{ind?.cpi?.lastDate||''}</td></tr>
              <tr><th>연준기준금리 상단</th><td>{fmt(ind?.fedfunds?.last)}</td><td className="muted">{ind?.fedfunds?.lastDate||''}</td></tr>
              <tr><th>10Y-2Y 스프레드</th><td>{fmt(ind?.t10y2y?.last)}</td><td className="muted">{ind?.t10y2y?.lastDate||''}</td></tr>
              <tr><th>재고/판매비율</th><td>{fmt(ind?.inventory_ratio?.last)}</td><td className="muted">{ind?.inventory_ratio?.lastDate||''}</td></tr>
              <tr><th>실업률(US)</th><td>{fmt(ind?.unemployment?.last)}</td><td className="muted">{ind?.unemployment?.lastDate||''}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="card" style={{gridColumn:'span 7'}}>
          <h2>주요 리테일러 주가(전일 대비)</h2>
          <table>
            <thead><tr><th>티커</th><th>이름</th><th>현재가</th><th>전일</th><th>등락%</th><th className="muted">시각</th></tr></thead>
            <tbody>
              {stocks?.quotes?.map(q=>{
                const c = (q.changePercent ?? 0) >= 0 ? 'pos':'neg';
                return (
                  <tr key={q.symbol}>
                    <td>{q.symbol}</td>
                    <td>{q.longName}</td>
                    <td>{fmt(q.regularMarketPrice)}</td>
                    <td>{fmt(q.regularMarketPreviousClose)}</td>
                    <td className={c}>{pct(q.changePercent)}</td>
                    <td className="muted">{q.ts ? new Date(q.ts).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
