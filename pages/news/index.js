import { useEffect, useState } from 'react';

export default function News(){
  const [ov,setOv] = useState(null);
  const [kr,setKr] = useState(null);
  useEffect(()=>{
    fetch('/data/news_overseas.json').then(r=>r.json()).then(setOv).catch(()=>{});
    fetch('/data/news_korea.json').then(r=>r.json()).then(setKr).catch(()=>{});
  },[]);

  const Item = ({it}) => (
    <li style={{marginBottom:8}}>
      <a href={it.url} target="_blank" rel="noreferrer">{it.title}</a>
      {it.publishedAt ? <div className="muted">{new Date(it.publishedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</div> : null}
    </li>
  );

  return (
    <div className="wrap">
      <h1>산업 뉴스</h1>
      <div className="grid" style={{marginTop:16}}>
        <section className="card" style={{gridColumn:'span 6'}}>
          <h2>해외 뉴스</h2>
          <ul style={{listStyle:'disc', paddingLeft:18}}>
            {(ov?.items||[]).slice(0,60).map((it,idx)=>(<Item key={idx} it={it}/>))}
          </ul>
        </section>
        <section className="card" style={{gridColumn:'span 6'}}>
          <h2>국내 뉴스</h2>
          <ul style={{listStyle:'disc', paddingLeft:18}}>
            {(kr?.items||[]).slice(0,120).map((it,idx)=>(<Item key={idx} it={it}/>))}
          </ul>
        </section>
      </div>
    </div>
  );
}
