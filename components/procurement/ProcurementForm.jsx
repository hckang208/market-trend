import React from "react";

export default function ProcurementForm({ data, setData, onSave, onClose, onReset }) {
  const row = { display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: 8, margin: "6px 0" };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

  return (
    <div style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <div style={row}>
        <label>기간 표시</label>
        <input value={data.periodLabel || ""} onChange={(e) => setData(d => ({ ...d, periodLabel: e.target.value }))} placeholder="예: 2025-09" />
      </div>
      <div style={row}>
        <label>방식</label>
        <input value={data.period || ""} onChange={(e) => setData(d => ({ ...d, period: e.target.value }))} placeholder="월간 / 주간 / 일간 등" />
      </div>
      <div style={row}>
        <label>통화</label>
        <select value={data.currency} onChange={(e) => setData(d => ({ ...d, currency: e.target.value }))}>
          <option value="USD">USD</option>
          <option value="KRW">KRW</option>
        </select>
      </div>

      <div style={grid2}>
        <div style={row}>
          <label>총 매출액</label>
          <input type="number" value={data.revenue ?? 0} onChange={(e) => setData(d => ({ ...d, revenue: Number(e.target.value) }))} />
        </div>
        <div style={row}>
          <label>총 부자재매입액</label>
          <input type="number" value={data.materialSpend ?? 0} onChange={(e) => setData(d => ({ ...d, materialSpend: Number(e.target.value) }))} />
        </div>
        <div style={row}>
          <label>총 Cost Save</label>
          <input type="number" value={data.costSave ?? 0} onChange={(e) => setData(d => ({ ...d, costSave: Number(e.target.value) }))} />
        </div>
      </div>

      <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>공급현황(%) — 합계 100 기준</div>
        <div style={grid3}>
          <div style={row}>
            <label>국내(%)</label>
            <input type="number" value={data.supplyBreakdown?.domestic ?? 0} onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, domestic: Number(e.target.value) } }))} />
          </div>
          <div style={row}>
            <label>3국(%)</label>
            <input type="number" value={data.supplyBreakdown?.thirdCountry ?? 0} onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, thirdCountry: Number(e.target.value) } }))} />
          </div>
          <div style={row}>
            <label>현지(%)</label>
            <input type="number" value={data.supplyBreakdown?.local ?? 0} onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, local: Number(e.target.value) } }))} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={onSave} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>저장</button>
        <button onClick={onClose} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>닫기</button>
        <button onClick={onReset} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", color: "#ef4444" }}>초기화</button>
      </div>
    </div>
  );
}
