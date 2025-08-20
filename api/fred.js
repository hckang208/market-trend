export default async function handler(req,res){
  try{
    const apiKey="b6c97db96d26274aff0fd1cdc0ccdfb6";
    const series=[
      { id:"IPB53110S", name:"섬유 산업 생산지수", unit:"index"},
      { id:"IPB53120S", name:"의류 제조 생산지수", unit:"index"},
      { id:"MRTSSM4481USN", name:"의류 매장 소매 판매", unit:"$"},
      { id:"CUUR0000SEAC", name:"CPI: 의류", unit:"%"},
      { id:"CUSR0000SEFW", name:"CPI: 여성복", unit:"%"},
      { id:"CUSR0000SEFM", name:"CPI: 남성복", unit:"%"},
      { id:"CUSR0000SEFC", name:"CPI: 신발", unit:"%"},
      { id:"IMP0000SEAPP", name:"수입물가지수: 의류", unit:"%"},
      { id:"RETAILIRSA", name:"소매 재고", unit:"$"},
      { id:"RRSFS", name:"소매·음식 서비스 매출", unit:"$"},
      { id:"UMCSENT", name:"미시간대 소비자심리", unit:"index"},
      { id:"CONFSP", name:"컨퍼런스보드 소비자신뢰", unit:"index"}
    ];
    const results=await Promise.all(series.map(async s=>{
      const url=`https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
      const r=await fetch(url); const d=await r.json();
      const [latest,prev]=d.observations;
      const change=(latest.value!=="."&&prev.value!==".")?((latest.value-prev.value)/prev.value)*100:null;
      return {id:s.id,name:s.name,value:latest.value,date:latest.date,unit:s.unit,change};
    }));
    res.status(200).json(results);
  }catch(e){ res.status(500).json({error:e.message}); }
}
