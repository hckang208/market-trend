
import React from "react";

export default function NewsHeader({ active, onChangeTab }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <div style={{ display:"flex", gap:8 }} data-testid="news-tabs-left">
        <button onClick={() => onChangeTab('overseas')} style={{ padding:'8px 12px', border:'1px solid var(--line)', borderRadius:999, background:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>해외뉴스</button>
        <button onClick={() => onChangeTab('korea')} style={{ padding:'8px 12px', border:'1px solid var(--line)', borderRadius:999, background:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>국내뉴스</button>
        <a href="/ai-summary" style={{ padding:'8px 12px', border:'1px solid var(--line)', borderRadius:999, background:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>AI 요약</a>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:"#6b7280" }}>뉴스출처: Just-Style, Business of Fashion, 한국섬유신문</span>
      </div>
    </div>
  );
}
