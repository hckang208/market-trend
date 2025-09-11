import { useEffect, useState } from 'react';

export default function AI(){
  const [ai,setAI] = useState(null);
  useEffect(()=>{ fetch('/data/ai_summary.json').then(r=>r.json()).then(setAI).catch(()=>{}); },[]);
  return (
    <div className="wrap">
      <h1>AI 요약 / 분석</h1>
      <div className="grid" style={{marginTop:16}}>
        <section className="card" style={{gridColumn:'span 6'}}>
          <h2>해외 동향 요약</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{ai?.overseas || '데이터 없음'}</pre>
        </section>
        <section className="card" style={{gridColumn:'span 6'}}>
          <h2>국내 동향 요약</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{ai?.korea || '데이터 없음'}</pre>
        </section>
      </div>
      <div className="muted" style={{marginTop:12}}>마지막 갱신: {ai?.updatedAtISO ? new Date(ai.updatedAtISO).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : '-'}</div>
    </div>
  );
}
