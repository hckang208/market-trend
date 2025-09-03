// components/ProcurementTopBlock.jsx
import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "procure.dashboard.v1";

const defaultData = {
  currency: "USD",          // "KRW" or "USD"
  period: "월간",            // 자유입력
  periodLabel: "",          // 예: "2025-09"
  revenue: 0,               // 총 매출액
  materialSpend: 0,         // 총 부자재매입액
  styles: 0,                // 총 오더수(스타일수)
  poCount: 0,               // 총 발행 PO수
  supplyBreakdown: {        // 공급현황(%)
    domestic: 0,            // 국내
    thirdCountry: 0,        // 3국
    local: 0                // 현지
  }
};

function fmtCurrency(value, currency = "USD") {
  const num = Number(value || 0);
  try {
    if (currency === "KRW") {
      return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(num);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
  } catch {
    // Intl 미지원 환경 대비
    return (currency === "KRW" ? "₩" : "$") + (num.toLocaleString());
  }
}
function pct(n) {
  const v = Number(n || 0);
  if (!isFinite(v)) return "0%";
  return `${v.toFixed(1)}%`;
}
function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export default function ProcurementTopBlock() {
  const [data, setData] = useState(defaultData);
  const [openEdit, setOpenEdit] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...defaultData, ...parsed });
      }
    } catch {}
  }, []);

  const ratio = useMemo(() => {
    const r = Number(data.revenue || 0);
    const m = Number(data.materialSpend || 0);
    if (r <= 0) return 0;
    return clamp((m / r) * 100, 0, 100);
  }, [data]);

  const supply = useMemo(() => {
    const { domestic = 0, thirdCountry = 0, local = 0 } = data.supplyBreakdown || {};
    const sum = Number(domestic) + Number(thirdCountry) + Number(local);
    if (sum <= 0) return { domestic: 0, thirdCountry: 0, local: 0 };
    return {
      domestic: clamp((domestic / sum) * 100),
      thirdCountry: clamp((thirdCountry / sum) * 100),
      local: clamp((local / sum) * 100)
    };
  }, [data]);

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setOpenEdit(false);
  }
  function reset() {
    setData(defaultData);
    localStorage.removeItem(LS_KEY);
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `procurement_dashboard_${(data.periodLabel || "current")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData({ ...defaultData, ...parsed });
      } catch {
        alert("JSON 파싱 실패. 올바른 파일인지 확인하세요.");
      }
    };
    reader.readAsText(file);
  }

  const card = (title, value, sub = "") => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {sub ? <div style={styles.cardSub}>{sub}</div> : null}
    </div>
  );

  return (
    <section style={styles.wrap}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.h2}>부자재구매현황 DASHBOARD</h2>
          <div style={styles.meta}>
            <span>기간: <b>{data.periodLabel || "—"}</b> / 방식: <b>{data.period || "—"}</b> / 통화: <b>{data.currency}</b></span>
          </div>
        </div>
        <div style={styles.tools}>
          <button onClick={() => setOpenEdit(v => !v)} style={styles.btnGray}>✏️ 편집</button>
          <button onClick={exportJSON} style={styles.btnGray}>⤓ Export</button>
          <label style={{...styles.btnGray, cursor:"pointer"}}>
            ⤒ Import
            <input type="file" accept="application/json" onChange={importJSON} style={{display:"none"}}/>
          </label>
          <a href="/daily-report" style={styles.btnBlue}>🤖 AI Daily Report</a>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.grid}>
        {card("총 매출액", fmtCurrency(data.revenue, data.currency))}
        {card("총 부자재매입액", fmtCurrency(data.materialSpend, data.currency))}
        <div style={styles.card}>
          <div style={styles.cardTitle}>매출 대비 부자재 매입비중</div>
          <div style={styles.cardValue}>{pct(ratio)}</div>
          <div style={styles.progressWrap} aria-label="material-spend-ratio">
            <div style={{...styles.progressBar, width: `${ratio}%`}} />
          </div>
        </div>
        {card("총 오더수(스타일)", (Number(data.styles || 0)).toLocaleString())}
        {card("총 발행 PO수", (Number(data.poCount || 0)).toLocaleString())}
      </div>

      {/* 공급현황 */}
      <div style={styles.block}>
        <div style={styles.blockTitle}>공급현황 (국내 / 3국 / 현지)</div>
        <div style={styles.stackBar} title={`국내 ${pct(supply.domestic)} / 3국 ${pct(supply.thirdCountry)} / 현지 ${pct(supply.local)}`}>
          <div style={{...styles.stackSeg, background:"#111827", width:`${supply.domestic}%`}} />
          <div style={{...styles.stackSeg, background:"#4B5563", width:`${supply.thirdCountry}%`}} />
          <div style={{...styles.stackSeg, background:"#9CA3AF", width:`${supply.local}%`}} />
        </div>
        <div style={styles.legendRow}>
          <span>국내 {pct(supply.domestic)}</span>
          <span>3국 {pct(supply.thirdCountry)}</span>
          <span>현지 {pct(supply.local)}</span>
        </div>
      </div>

      {/* CTA */}
      <div style={styles.ctaRow}>
        <a href="#incidents" style={styles.cta}>부자재 관련사고</a>
        <a href="#materials" style={styles.cta}>부자재 관련 자료</a>
        <a href="/chatbot" style={styles.ctaOutline}>AI Chatbot (한솔부자재)</a>
      </div>

      {/* Edit Panel */}
      {openEdit && (
        <div style={styles.editBox}>
          <div style={styles.editRow}>
            <label>기간 표시</label>
            <input value={data.periodLabel || ""} onChange={e=>setData(d=>({...d, periodLabel:e.target.value}))} placeholder="예: 2025-09" />
          </div>
          <div style={styles.editRow}>
            <label>방식</label>
            <input value={data.period || ""} onChange={e=>setData(d=>({...d, period:e.target.value}))} placeholder="월간 / 주간 / 일간 등" />
          </div>
          <div style={styles.editRow}>
            <label>통화</label>
            <select value={data.currency} onChange={e=>setData(d=>({...d, currency:e.target.value}))}>
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
            </select>
          </div>
          <div style={styles.grid2}>
            <div style={styles.editRow}>
              <label>총 매출액</label>
              <input type="number" value={data.revenue} onChange={e=>setData(d=>({...d, revenue:Number(e.target.value)}))}/>
            </div>
            <div style={styles.editRow}>
              <label>총 부자재매입액</label>
              <input type="number" value={data.materialSpend} onChange={e=>setData(d=>({...d, materialSpend:Number(e.target.value)}))}/>
            </div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.editRow}>
              <label>총 오더수(스타일)</label>
              <input type="number" value={data.styles} onChange={e=>setData(d=>({...d, styles:Number(e.target.value)}))}/>
            </div>
            <div style={styles.editRow}>
              <label>총 발행 PO수</label>
              <input type="number" value={data.poCount} onChange={e=>setData(d=>({...d, poCount:Number(e.target.value)}))}/>
            </div>
          </div>

          <div style={styles.block}>
            <div style={styles.blockTitle}>공급현황(%) — 합계 100 기준</div>
            <div style={styles.grid3}>
              <div style={styles.editRow}>
                <label>국내(%)</label>
                <input type="number" value={data.supplyBreakdown.domestic} onChange={e=>setData(d=>({...d, supplyBreakdown:{...d.supplyBreakdown, domestic:Number(e.target.value)}}))}/>
              </div>
              <div style={styles.editRow}>
                <label>3국(%)</label>
                <input type="number" value={data.supplyBreakdown.thirdCountry} onChange={e=>setData(d=>({...d, supplyBreakdown:{...d.supplyBreakdown, thirdCountry:Number(e.target.value)}}))}/>
              </div>
              <div style={styles.editRow}>
                <label>현지(%)</label>
                <input type="number" value={data.supplyBreakdown.local} onChange={e=>setData(d=>({...d, supplyBreakdown:{...d.supplyBreakdown, local:Number(e.target.value)}}))}/>
              </div>
            </div>
          </div>

          <div style={{display:"flex", gap:8, marginTop:12}}>
            <button onClick={save} style={styles.btnBlue}>저장</button>
            <button onClick={()=>setOpenEdit(false)} style={styles.btnGray}>닫기</button>
            <button onClick={reset} style={styles.btnDanger}>초기화</button>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  wrap: { background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:16, margin:"20px 0" },
  headerRow: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" },
  h2: { margin:"6px 0 2px", fontSize:20, fontWeight:900 },
  meta: { color:"#6b7280", fontSize:13 },
  tools: { display:"flex", gap:8, alignItems:"center" },

  btnGray: { background:"#f3f4f6", border:"1px solid #e5e7eb", padding:"8px 10px", borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none", color:"#111" },
  btnBlue: { background:"#2563eb", border:"1px solid #1d4ed8", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13, color:"#fff", textDecoration:"none" },
  btnDanger: { background:"#fee2e2", border:"1px solid #fecaca", padding:"8px 10px", borderRadius:10, fontWeight:700, fontSize:13, color:"#991b1b" },

  grid: { display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginTop:12 },
  card: { border:"1px solid #e5e7eb", borderRadius:12, padding:"12px 12px" },
  cardTitle: { fontSize:12, color:"#6b7280", fontWeight:800, marginBottom:6 },
  cardValue: { fontSize:20, fontWeight:900 },
  cardSub: { fontSize:12, color:"#6b7280" },

  progressWrap: { background:"#f3f4f6", borderRadius:999, height:8, marginTop:8, overflow:"hidden" },
  progressBar: { background:"#111827", height:8 },

  block: { border:"1px dashed #e5e7eb", borderRadius:12, padding:12, marginTop:12 },
  blockTitle: { fontWeight:900, fontSize:13, marginBottom:10 },
  stackBar: { display:"flex", width:"100%", height:12, borderRadius:999, overflow:"hidden", background:"#f3f4f6" },
  stackSeg: { height:"100%" },
  legendRow: { display:"flex", gap:16, marginTop:8, fontSize:12, color:"#374151" },

  ctaRow: { display:"flex", gap:8, marginTop:12, flexWrap:"wrap" },
  cta: { background:"#111827", color:"#fff", textDecoration:"none", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13 },
  ctaOutline: { border:"1px solid #111827", color:"#111827", textDecoration:"none", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13, background:"#fff" },

  editBox: { border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginTop:12, background:"#fafafa" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  grid3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 },
  editRow: { display:"grid", gap:6 },
};
